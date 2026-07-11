import { groq } from "@/lib/groq";

function extractQuestions(raw) {
  const cleaned = raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  const arr = cleaned.match(/\[[\s\S]*\]/);
  if (arr) { try { return JSON.parse(arr[0]); } catch {} }
  const obj = cleaned.match(/\{[\s\S]*\}/);
  if (obj) { try { const p = JSON.parse(obj[0]); if (Array.isArray(p.questions)) return p.questions; } catch {} }
  throw new Error("no JSON array found");
}

export async function POST(req) {
  try {
    const { concepts, num_questions = 5 } = await req.json();
    if (!concepts?.length) return Response.json({ error: "no concepts" }, { status: 400 });

    const n = Math.min(Math.max(num_questions, 1), 15);
    const pool = concepts
      .slice(0, 40)
      .map(c => ({ name: c.name || String(c), summary: c.summary || "" }));

    const prompt = `Eres un profesor. Genera exactamente ${n} preguntas de examen basadas en estos conceptos:
${JSON.stringify(pool)}

Cada pregunta debe:
- Evaluar comprensión real, no memorización literal
- Tener 4 opciones (A B C D), solo una correcta
- Incluir explicación de por qué la respuesta correcta es correcta (máx 25 palabras)

Responde SOLO con un JSON array (sin bloque de código):
[{"concept":"nombre","question":"...","options":{"A":"...","B":"...","C":"...","D":"..."},"correct":"A","explanation":"..."}]`;

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const completion = await groq.chat.completions.create({
          model: "openai/gpt-oss-120b",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 2000,
          temperature: 0.3,
        });

        const raw = completion.choices[0]?.message?.content ?? "";
        const questions = extractQuestions(raw);

        if (Array.isArray(questions) && questions.length > 0) {
          const valid = questions.filter(q =>
            q.question && q.options?.A && q.options?.B && q.options?.C && q.options?.D && q.correct
          );
          if (valid.length > 0) return Response.json({ questions: valid.slice(0, n) });
        }

        if (attempt === 2) return Response.json({ skip: true });
      } catch {
        if (attempt === 2) return Response.json({ skip: true });
      }
    }
    return Response.json({ skip: true });
  } catch (err) {
    if (err?.status === 429) return Response.json({ skip: true });
    console.error("[exam] error:", err);
    return Response.json({ error: "exam failed" }, { status: 500 });
  }
}
