import { groq } from "@/lib/groq";

const VALID_TYPES = ["whiteboard", "slide", "diagram", "graph", "formula", "table", "screenshot", "photo", "other"];

const EMPTY = { content_type: "other", description: "", extracted_text: null, key_concepts: [], gaps: null };

export async function POST(request) {
  const { imageBase64, mimeType = "image/jpeg", transcript = "" } = await request.json();

  if (!imageBase64) {
    return Response.json({ error: "No image provided" }, { status: 400 });
  }

  console.log(`[analyze-image] processing: mimeType=${mimeType}, size=${Math.round(imageBase64.length * 0.75 / 1024)}KB`);

  const transcriptContext = transcript.length > 2000 ? transcript.slice(-2000) : transcript;

  const prompt = `Eres un asistente educativo analizando material visual capturado durante una clase.

TRANSCRIPCIÓN ACTUAL (últimas palabras del profesor):
${transcriptContext || "(sin transcripción todavía)"}

Analiza la imagen y responde ÚNICAMENTE en JSON válido sin bloques de código ni markdown:
{
  "content_type": "uno de: whiteboard | slide | diagram | graph | formula | table | screenshot | photo | other",
  "description": "descripción concisa en español de qué muestra la imagen, máximo 80 palabras",
  "extracted_text": "TODO el texto legible en la imagen: fórmulas, ecuaciones, términos, datos, labels. Si no hay texto, devuelve null",
  "key_concepts": ["concepto 1", "concepto 2"],
  "gaps": "información visible que NO aparece en la transcripción (fórmulas, términos no mencionados verbalmente). Si no hay gaps, devuelve null"
}

Clasificación:
- whiteboard: pizarrón | slide: diapositiva | diagram: diagrama/esquema | graph: gráfica/función
- formula: ecuación prominente | table: tabla de datos | screenshot: captura de pantalla/código
- photo: fotografía real | other: cualquier otro visual`;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const completion = await groq.chat.completions.create({
        model: "qwen/qwen3-vl-32b-instruct",
        messages: [
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
              { type: "text", text: prompt },
            ],
          },
        ],
        max_tokens: 800,
        temperature: 0.1,
      });

      let text = (completion.choices[0]?.message?.content ?? "").trim();

      // Strip thinking tokens from reasoning models
      text = text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
      // Strip markdown code fences
      text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        const match = text.match(/\{[\s\S]*\}/);
        if (!match) throw new Error("No JSON in response");
        parsed = JSON.parse(match[0]);
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
      if (e?.status === 429 || e?.message?.includes("429")) {
        console.error("[analyze-image] rate limit hit");
        return Response.json(EMPTY, { status: 429 });
      }
      if (attempt === 2) {
        console.error("[analyze-image] failed after 2 attempts:", e?.message || e);
        return Response.json(EMPTY, { status: 500 });
      }
    }
  }

  return Response.json(EMPTY, { status: 500 });
}
