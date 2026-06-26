import { groq } from "@/lib/groq";

function parseJSON(raw) {
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("no JSON");
  return JSON.parse(m[0]);
}

export async function POST(req) {
  try {
    const { concept_name, concept_summary } = await req.json();

    if (!concept_name || !concept_summary) {
      return Response.json({ error: "missing concept fields" }, { status: 400 });
    }

    const prompt = `El estudiante respondió incorrectamente sobre el concepto: "${concept_name}".
Contexto: ${concept_summary}
Genera en markdown: 1) resumen de 3-4 líneas en lenguaje simple, 2) mini mapa mental como lista jerárquica markdown. Claro, sin relleno.
Devuelve SOLO: {"markdown": "..."}`;

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const completion = await groq.chat.completions.create({
          model: "openai/gpt-oss-120b",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 500,
        });

        const raw = completion.choices[0]?.message?.content ?? "";
        const parsed = parseJSON(raw);

        if (parsed.markdown) {
          return Response.json({ markdown: parsed.markdown });
        }

        if (attempt === 2) {
          return Response.json({ skip: true });
        }
      } catch (parseErr) {
        if (attempt === 2) {
          return Response.json({ skip: true });
        }
      }
    }

    return Response.json({ skip: true });
  } catch (err) {
    if (err?.status === 429 || err?.message?.includes("429")) {
      return Response.json({ skip: true });
    }
    console.error("[reinforcement] error:", err);
    return Response.json({ error: "reinforcement generation failed" }, { status: 500 });
  }
}
