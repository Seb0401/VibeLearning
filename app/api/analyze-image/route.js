import { groq } from "@/lib/groq";

const VALID_TYPES = ["whiteboard", "slide", "diagram", "graph", "formula", "table", "screenshot", "photo", "other"];
const EMPTY = { content_type: "other", description: "", extracted_text: null, key_concepts: [], gaps: null };

export async function POST(request) {
  try {
    const { imageBase64, mimeType = "image/jpeg", transcript = "" } = await request.json();

    if (!imageBase64) {
      return Response.json({ error: "No image provided" }, { status: 400 });
    }

    const sizeKB = Math.round(imageBase64.length * 0.75 / 1024);
    console.log(`[analyze-image] received: mimeType=${mimeType}, size=${sizeKB}KB`);

    const transcriptContext = transcript.length > 2000 ? transcript.slice(-2000) : transcript;

    const prompt = `Eres un asistente educativo analizando material visual capturado durante una clase.

TRANSCRIPCIÓN ACTUAL:
${transcriptContext || "(sin transcripción todavía)"}

Analiza la imagen y responde ÚNICAMENTE con JSON válido, sin bloques de código ni texto extra:
{
  "content_type": "whiteboard | slide | diagram | graph | formula | table | screenshot | photo | other",
  "description": "descripción en español de qué muestra la imagen, máximo 80 palabras",
  "extracted_text": "TODO el texto legible: fórmulas, ecuaciones, términos, datos, labels. null si no hay",
  "key_concepts": ["concepto 1", "concepto 2"],
  "gaps": "info visible que NO aparece en la transcripción. null si no hay gaps"
}`;

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const completion = await groq.chat.completions.create({
          model: "meta-llama/llama-4-scout-17b-16e-instruct",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
              ],
            },
          ],
          max_tokens: 800,
          temperature: 0.1,
        });

        let text = (completion.choices[0]?.message?.content ?? "").trim();
        // Strip thinking tokens (<think>...</think>) from reasoning models
        text = text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
        text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

        let parsed;
        try {
          parsed = JSON.parse(text);
        } catch {
          const match = text.match(/\{[\s\S]*\}/);
          parsed = match ? JSON.parse(match[0]) : null;
        }

        if (!parsed) {
          console.error(`[analyze-image] attempt ${attempt}: no JSON found in response: "${text.slice(0, 120)}"`);
          if (attempt === 2) return Response.json(EMPTY, { status: 500 });
          continue;
        }

        const result = {
          content_type: VALID_TYPES.includes(parsed.content_type) ? parsed.content_type : "other",
          description: parsed.description || "",
          extracted_text: parsed.extracted_text && parsed.extracted_text !== "null" ? parsed.extracted_text : null,
          key_concepts: Array.isArray(parsed.key_concepts) ? parsed.key_concepts : [],
          gaps: parsed.gaps && parsed.gaps !== "null" ? parsed.gaps : null,
        };

        console.log(`[analyze-image] OK: type=${result.content_type}, hasOCR=${!!result.extracted_text}, concepts=${result.key_concepts.length}`);
        return Response.json(result);

      } catch (e) {
        const status = e?.status ?? e?.error?.code;
        console.error(`[analyze-image] attempt ${attempt} error — status=${status} msg=${e?.message?.slice(0, 200)}`);
        if (status === 429) return Response.json(EMPTY, { status: 429 });
        if (attempt === 2) return Response.json(EMPTY, { status: 500 });
      }
    }

    return Response.json(EMPTY, { status: 500 });

  } catch (fatal) {
    console.error("[analyze-image] fatal outer error:", fatal?.message);
    return Response.json(EMPTY, { status: 500 });
  }
}
