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

    // Debug — visible in Vercel Function Logs
    console.log(`[chatbot] sources: transcript=${transcriptTruncated.length} chars | pdf=${material ? "yes" : "no"} | visual=${visual ? visual.length + " chars" : "none"}`);

    // Build context sections — only include non-empty sources
    const contextParts = [];
    if (transcriptTruncated) {
      contextParts.push(`=== TRANSCRIPCIÓN DE CLASE ===\n${transcriptTruncated}`);
    }
    if (material) {
      contextParts.push(`=== MATERIAL PDF ===\n${material}`);
    }
    if (visual) {
      contextParts.push(`=== NOTAS VISUALES (capturas de diapositivas, pizarrón, diagramas — incluye texto OCR extraído) ===\n${visual}`);
    }

    const contextBlock = contextParts.length
      ? contextParts.join("\n\n")
      : "Sin contexto disponible aún.";

    const sourcesAvailable = [
      transcriptTruncated && "transcript de audio",
      material && "material PDF",
      visual && "notas visuales con OCR",
    ].filter(Boolean).join(", ") || "ninguna fuente";

    const prompt = `Eres un asistente educativo. Tienes acceso a las siguientes fuentes de la clase: ${sourcesAvailable}.

${contextBlock}

Pregunta: "${question}"

INSTRUCCIONES:
- Responde usando TODA la información disponible — transcript, PDF y especialmente las notas visuales si las hay.
- Si la respuesta está en las NOTAS VISUALES (texto OCR, descripción de imagen), úsala directamente y menciona que viene de una captura visual.
- Texto plano, SIN markdown. Máximo 3 oraciones claras y directas.
- Solo di "No tengo esa información en el contexto disponible" si realmente no hay datos relevantes en NINGUNA fuente.`;

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const completion = await groq.chat.completions.create({
          model: "openai/gpt-oss-120b",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 220,
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

        if (cleaned) return Response.json({ answer: cleaned });
        if (attempt === 2) return Response.json({ skip: true });
      } catch {
        if (attempt === 2) return Response.json({ skip: true });
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
