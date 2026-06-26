import { groq } from "@/lib/groq";

function parseJSON(raw) {
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("no JSON");
  return JSON.parse(m[0]);
}

export async function POST(req) {
  try {
    const { transcript, concepts } = await req.json();

    if (!transcript && (!concepts || concepts.length === 0)) {
      return Response.json({ error: "no content to summarize" }, { status: 400 });
    }

    const concepts_json = JSON.stringify(concepts ?? []);

    const prompt = `La clase terminó. Tienes la transcripción completa y los conceptos cubiertos. Genera:
1. Título corto (máx 6 palabras) del tema.
2. Resumen high-yield para repaso, organizado por tema, máx 400 palabras, en markdown (## y **bold**).
3. Mapa mental completo como lista jerárquica markdown.
Responde SOLO con JSON: {"title":"...","final_summary":"...","final_mindmap":"..."}
Transcripción: """${transcript ?? ""}""" Conceptos: ${concepts_json}`;

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const completion = await groq.chat.completions.create({
          model: "openai/gpt-oss-120b",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 1200,
        });

        const raw = completion.choices[0]?.message?.content ?? "";
        const parsed = parseJSON(raw);

        if (parsed.title && parsed.final_summary && parsed.final_mindmap) {
          return Response.json({
            title: parsed.title,
            final_summary: parsed.final_summary,
            final_mindmap: parsed.final_mindmap,
          });
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
    console.error("[finish-class] error:", err);
    return Response.json({ error: "finish-class generation failed" }, { status: 500 });
  }
}
