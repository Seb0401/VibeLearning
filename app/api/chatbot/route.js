import { groq } from "@/lib/groq";

function stripMarkdown(text) {
  return text
    .replace(/#{1,6}\s*/g, "")      // headers
    .replace(/\*\*(.+?)\*\*/g, "$1") // bold
    .replace(/\*(.+?)\*/g, "$1")     // italic
    .replace(/`(.+?)`/g, "$1")       // inline code
    .replace(/[-*+]\s+/g, "")        // list bullets
    .replace(/\n{2,}/g, " ")         // doble salto → espacio
    .replace(/\n/g, " ")             // salto simple → espacio
    .trim();
}

function parseJSON(raw) {
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("no JSON");
  return JSON.parse(m[0]);
}

export async function POST(req) {
  try {
    const { question, material_summary, transcript } = await req.json();

    if (!question) {
      return Response.json({ error: "missing question" }, { status: 400 });
    }

    // Truncar transcript a ~3000 palabras
    const transcriptWords = (transcript ?? "").split(/\s+/);
    const transcriptTruncated = transcriptWords.slice(-3000).join(" ");

    const material = material_summary?.trim() || "No se subió material.";

    const prompt = `Eres un asistente educativo dentro de una clase en vivo.
Material: """${material}"""
Transcripción hasta ahora (últimas ~3000 palabras): """${transcriptTruncated}"""
Pregunta del estudiante: "${question}"
Responde en texto plano, SIN markdown (sin **, sin #, sin guiones). Máximo 2-3 oraciones, máximo 50 palabras, salvo que pidan más detalle. Ve directo a la idea. Si no se puede responder con el contexto, dilo honestamente.
Devuelve SOLO: {"answer": "..."}`;

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const completion = await groq.chat.completions.create({
          model: "openai/gpt-oss-120b",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 110,
        });

        const raw = completion.choices[0]?.message?.content ?? "";

        let answer = "";

        try {
          const parsed = parseJSON(raw);
          answer = parsed.answer ?? raw;
        } catch {
          // Si no viene JSON, usar el texto directo
          answer = raw;
        }

        answer = stripMarkdown(answer);

        if (answer) {
          return Response.json({ answer });
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
