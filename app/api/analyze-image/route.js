const VALID_TYPES = ["whiteboard", "slide", "diagram", "graph", "formula", "table", "screenshot", "photo", "other"];
const EMPTY = { content_type: "other", description: "", extracted_text: null, key_concepts: [], gaps: null };

// Use fetch directly — groq-sdk v1.3.0 may not support vision content arrays
async function callGroqVision(imageBase64, mimeType, prompt) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
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
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw Object.assign(new Error(`Groq vision error ${res.status}: ${errBody}`), { status: res.status });
  }

  const data = await res.json();
  return data.choices[0]?.message?.content ?? "";
}

export async function POST(request) {
  try {
    const { imageBase64, mimeType = "image/jpeg", transcript = "" } = await request.json();

    if (!imageBase64) {
      return Response.json({ error: "No image provided" }, { status: 400 });
    }

    if (!process.env.GROQ_API_KEY) {
      console.error("[analyze-image] GROQ_API_KEY is not set");
      return Response.json(EMPTY, { status: 500 });
    }

    const sizeKB = Math.round(imageBase64.length * 0.75 / 1024);
    console.log(`[analyze-image] received: mimeType=${mimeType}, size=${sizeKB}KB`);

    if (sizeKB > 3800) {
      console.error(`[analyze-image] image too large: ${sizeKB}KB (limit ~4000KB)`);
      return Response.json(EMPTY, { status: 413 });
    }

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
        let text = await callGroqVision(imageBase64, mimeType, prompt);

        // Strip thinking tokens from reasoning models
        text = text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
        text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

        let parsed;
        try {
          parsed = JSON.parse(text);
        } catch {
          const match = text.match(/\{[\s\S]*\}/);
          if (!match) throw new Error(`No JSON in response: ${text.slice(0, 100)}`);
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
        if (e?.status === 429) {
          console.error("[analyze-image] rate limit hit");
          return Response.json(EMPTY, { status: 429 });
        }
        console.error(`[analyze-image] attempt ${attempt} failed:`, e?.message?.slice(0, 200));
        if (attempt === 2) {
          return Response.json(EMPTY, { status: 500 });
        }
      }
    }
  } catch (outer) {
    console.error("[analyze-image] outer error:", outer?.message);
    return Response.json(EMPTY, { status: 500 });
  }

  return Response.json(EMPTY, { status: 500 });
}
