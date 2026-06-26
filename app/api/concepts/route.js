import { groq } from "@/lib/groq";

function buildSystem(existingConcepts = []) {
  const existingList = existingConcepts.length
    ? existingConcepts.join(", ")
    : "ninguno";
  return `Eres un asistente educativo. Analiza este fragmento de transcripción de clase.

REGLA PRINCIPAL: Solo extrae conceptos que el profesor haya NOMBRADO Y EXPLICADO explícitamente en el texto. No añadas conocimiento de fondo ni conceptos implícitos que el profesor no mencionó.

Proceso de razonamiento:
1. Identifica qué términos técnicos o ideas específicas mencionó el profesor
2. Filtra solo los que fueron definidos o explicados, no los mencionados solo de pasada
3. Elige MÁXIMO 3 (o menos si no hay suficientes conceptos claros y nuevos)

Conceptos ya extraídos — NO los repitas ni parafrasees: ${existingList}

Responde ÚNICAMENTE con JSON válido, sin markdown ni texto extra.
Formato exacto: {"concepts":[{"name":"...","summary":"..."}]}
Si no hay conceptos nuevos claros, devuelve: {"concepts":[]}
Resumen de cada uno: 1-2 oraciones en lenguaje simple.`;
}

function parseConceptsJSON(raw) {
  let text = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1) text = text.slice(start, end + 1);
  return JSON.parse(text);
}

export async function POST(request) {
  try {
    const { transcript, existing_concepts = [] } = await request.json();
    if (!transcript) {
      return Response.json({ concepts: [] });
    }

    const system = buildSystem(existing_concepts);

    const completion = await groq.chat.completions.create({
      model: "openai/gpt-oss-20b",
      messages: [
        { role: "system", content: system },
        { role: "user", content: `Transcripción:\n${transcript.slice(0, 4000)}` },
      ],
      max_tokens: 400,
      temperature: 0.3,
    });

    const raw = completion.choices?.[0]?.message?.content ?? "";

    try {
      const parsed = parseConceptsJSON(raw);
      return Response.json({ concepts: parsed.concepts ?? [] });
    } catch {
      const repair = await groq.chat.completions.create({
        model: "openai/gpt-oss-20b",
        messages: [
          { role: "system", content: system },
          { role: "user", content: `Transcripción:\n${transcript.slice(0, 4000)}` },
          { role: "assistant", content: raw },
          { role: "user", content: "El JSON anterior no es válido. Devuelve SOLO el JSON corregido." },
        ],
        max_tokens: 400,
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
