import { groq } from "@/lib/groq";

export async function POST(req) {
  try {
    const { question, material_summary, transcript } = await req.json();

    if (!question) {
      return Response.json({ error: "missing question" }, { status: 400 });
    }

    const transcriptWords = (transcript ?? "").split(/\s+/);
    const transcriptTruncated = transcriptWords.slice(-3000).join(" ");

    const material = material_summary?.trim() || "No se subió material.";

    const prompt = `Eres un asistente educativo dentro de una clase en vivo.
Material: """${material}"""
Transcripción hasta ahora (últimas ~3000 palabras): """${transcriptTruncated}"""
Pregunta del estudiante: "${question}"
Responde en texto plano, SIN markdown, SIN JSON, solo la respuesta directa. Máximo 2-3 oraciones, máximo 50 palabras salvo que pidan más detalle. Ve directo a la idea. Si no se puede responder con el contexto, dilo honestamente.`;

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const completion = await groq.chat.completions.create({
          model: "openai/gpt-oss-120b",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 160,
        });

        const rawText = completion.choices[0]?.message?.content ?? "";
        const cleaned = rawText
          .trim()
          .replace(/\*\*/g, "")
          .replace(/^#+\s*/gm, "")
          .replace(/^-\s+/gm, "")
          .replace(/^\{?"?answer"?:?\s*"?/i, "")
          .replace(/"?\}?$/g, "")
          .trim();

        if (cleaned) {
          return Response.json({ answer: cleaned });
        }

        if (attempt === 2) {
          return Response.json({ skip: true });
        }
      } catch (innerErr) {
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
    console.error("[chatbot] error:", err);
    return Response.json({ error: "chatbot failed" }, { status: 500 });
  }
}
