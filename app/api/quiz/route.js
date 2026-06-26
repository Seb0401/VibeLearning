import { groq } from "@/lib/groq";

function parseJSON(raw) {
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("no JSON");
  return JSON.parse(m[0]);
}

export async function POST(req) {
  try {
    const { concepts } = await req.json();

    if (!concepts || concepts.length === 0) {
      return Response.json({ error: "no concepts provided" }, { status: 400 });
    }

    const concepts_json = JSON.stringify(concepts);

    const prompt = `Basándote en estos conceptos: ${concepts_json}
Genera UNA pregunta de opción múltiple (A, B, C) MUY corta y simple — se lee y responde en menos de 10 segundos. Evalúa LA IDEA PRINCIPAL, no un detalle. Opciones de máximo una línea.
Responde SOLO con JSON: {"concept":"...","question":"...","options":{"A":"...","B":"...","C":"..."},"correct":"A"}`;

    let raw = "";

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const completion = await groq.chat.completions.create({
          model: "openai/gpt-oss-20b",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 300,
        });

        raw = completion.choices[0]?.message?.content ?? "";

        const parsed = parseJSON(raw);

        // Validar estructura mínima
        if (
          parsed.concept &&
          parsed.question &&
          parsed.options?.A &&
          parsed.options?.B &&
          parsed.options?.C &&
          parsed.correct
        ) {
          return Response.json(parsed);
        }

        // Si la estructura no es válida, reintentamos
        if (attempt === 2) {
          return Response.json({ skip: true });
        }
      } catch (parseErr) {
        if (attempt === 2) {
          return Response.json({ skip: true });
        }
        // Reintento silencioso
      }
    }

    return Response.json({ skip: true });
  } catch (err) {
    if (err?.status === 429 || err?.message?.includes("429")) {
      return Response.json({ skip: true });
    }
    console.error("[quiz] error:", err);
    return Response.json({ error: "quiz generation failed" }, { status: 500 });
  }
}
