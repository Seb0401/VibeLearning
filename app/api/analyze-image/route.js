import { groq } from "@/lib/groq";

const VALID_TYPES = ["whiteboard", "slide", "diagram", "graph", "formula", "table", "screenshot", "photo", "other"];
const EMPTY = { content_type: "other", description: "", extracted_text: null, key_concepts: [], gaps: null };

export async function POST(request) {
  try {
    const body = await request.json();
    const { imageBase64, mimeType = "image/jpeg", transcript = "" } = body;

    if (!imageBase64) return Response.json({ error: "No image provided" }, { status: 400 });

    const sizeKB = Math.round(imageBase64.length * 0.75 / 1024);
    console.log(`[analyze-image] START size=${sizeKB}KB`);

    const transcriptContext = transcript.length > 2000 ? transcript.slice(-2000) : transcript;
    const prompt = `Analiza la imagen y responde SOLO con JSON válido sin bloques de código:
{"content_type":"whiteboard|slide|diagram|graph|formula|table|screenshot|photo|other","description":"descripción en español máximo 60 palabras","extracted_text":"texto legible o null","key_concepts":["concepto"],"gaps":"info visual no mencionada verbalmente o null"}
Transcripción actual: ${transcriptContext || "ninguna"}`;

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`[analyze-image] attempt ${attempt} — calling groq vision`);

        const completion = await groq.chat.completions.create({
          model: "meta-llama/llama-4-scout-17b-16e-instruct",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: { url: `data:${mimeType};base64,${imageBase64}` },
                },
                { type: "text", text: prompt },
              ],
            },
          ],
          max_tokens: 600,
          temperature: 0.1,
        });

        let text = (completion.choices[0]?.message?.content ?? "").trim();
        text = text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
        text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
        console.log(`[analyze-image] raw response: ${text.slice(0, 200)}`);

        let parsed = null;
        try { parsed = JSON.parse(text); }
        catch { const m = text.match(/\{[\s\S]*\}/); if (m) parsed = JSON.parse(m[0]); }

        if (!parsed) {
          if (attempt === 2) return Response.json(EMPTY, { status: 200 });
          continue;
        }

        const result = {
          content_type: VALID_TYPES.includes(parsed.content_type) ? parsed.content_type : "other",
          description: parsed.description || "",
          extracted_text: parsed.extracted_text && parsed.extracted_text !== "null" ? parsed.extracted_text : null,
          key_concepts: Array.isArray(parsed.key_concepts) ? parsed.key_concepts : [],
          gaps: parsed.gaps && parsed.gaps !== "null" ? parsed.gaps : null,
        };
        console.log(`[analyze-image] OK type=${result.content_type} ocr=${!!result.extracted_text}`);
        return Response.json(result);

      } catch (err) {
        const code = err?.status ?? err?.code ?? "unknown";
        const msg = (err?.message ?? String(err)).slice(0, 300);
        console.error(`[analyze-image] attempt ${attempt} FAILED — code=${code} msg=${msg}`);
        if (err?.status === 429) return Response.json(EMPTY, { status: 200 });
        if (attempt === 2) return Response.json(EMPTY, { status: 200 });
      }
    }

    return Response.json(EMPTY, { status: 200 });
  } catch (fatal) {
    console.error("[analyze-image] FATAL:", fatal?.message ?? String(fatal));
    return Response.json(EMPTY, { status: 200 });
  }
}
