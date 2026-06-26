import { groq } from "@/lib/groq";

export async function POST(req) {
  try {
    const { question, material_summary, transcript, visual_context } = await req.json();

    if (!question) {
      return Response.json({ error: "missing question" }, { status: 400 });
    }

    const transcriptWords = (transcript ?? "").split(/\s+/);
    const transcriptTruncated = transcriptWords.slice(-3000).join(" ");

    const material = material_summary?.trim() || null;
    const visual   = visual_context?.trim()   || null;

    // Build context block — only include non-empty sources
    const contextParts = [];
    if (transcriptTruncated) {
      contextParts.push(`TRANSCRIPCIÓN DE CLASE (últimas ~3000 palabras):\n"""${transcriptTruncated}"""`);
    }
    if (material) {
      contextParts.push(`MATERIAL PDF:\n"""${material}"""`);
    }
    if (visual) {
      contextParts.push(`NOTAS VISUALES (diapositivas, pizarrón, diagramas y texto OCR capturado durante la clase):\n"""${visual}"""`);
    }

    const contextBlock = contextParts.length
      ? contextParts.join("\n\n")
      : "No hay contexto disponible aún.";

    const prompt = `Eres un asistente educativo con acceso a múltiples fuentes de la clase en vivo.

${contextBlock}

Pregunta del estudiante: "${question}"

Responde en texto plano, SIN markdown, SIN JSON, solo la respuesta directa. Máximo 2-3 oraciones salvo que pidan más detalle. Si la respuesta está en las notas visuales (OCR, diagramas), menciona que la información viene de una imagen capturada. Si no puedes responder con el contexto disponible, dilo honestamente.`;

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
