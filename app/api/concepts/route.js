import { groq } from "@/lib/groq";

const SYSTEM = `Eres un asistente educativo. Dado un fragmento de transcripción de clase, extrae los conceptos clave.
Responde ÚNICAMENTE con JSON válido, sin markdown ni texto extra.
Formato exacto: {"concepts":[{"name":"...","summary":"..."}]}
Máximo 5 conceptos. Resumen de cada uno en 1-2 oraciones.`;

function parseConceptsJSON(raw) {
  // Strip markdown code fences if present
  let text = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1) text = text.slice(start, end + 1);
  return JSON.parse(text);
}

export async function POST(request) {
  try {
    const { transcript } = await request.json();
    if (!transcript) {
      return Response.json({ concepts: [] });
    }

    const completion = await groq.chat.completions.create({
      model: "openai/gpt-oss-20b",
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: `Transcripción:\n${transcript.slice(0, 4000)}` },
      ],
      max_tokens: 512,
      temperature: 0.3,
    });

    const raw = completion.choices?.[0]?.message?.content ?? "";

    try {
      const parsed = parseConceptsJSON(raw);
      return Response.json({ concepts: parsed.concepts ?? [] });
    } catch {
      // Retry with explicit repair prompt
      const repair = await groq.chat.completions.create({
        model: "openai/gpt-oss-20b",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: `Transcripción:\n${transcript.slice(0, 4000)}` },
          { role: "assistant", content: raw },
          { role: "user", content: "El JSON anterior no es válido. Devuelve SOLO el JSON corregido." },
        ],
        max_tokens: 512,
        temperature: 0,
      });
      const raw2 = repair.choices?.[0]?.message?.content ?? "";
      try {
        const parsed2 = parseConceptsJSON(raw2);
        return Response.json({ concepts: parsed2.concepts ?? [] });
      } catch {
        return Response.json({ concepts: [] });
      }
    }
  } catch (err) {
    if (err?.status === 429 || err?.error?.code === "rate_limit_exceeded") {
      return Response.json({ skip: true });
    }
    console.error("[concepts]", err);
    return Response.json({ error: "concepts failed" }, { status: 500 });
  }
}
