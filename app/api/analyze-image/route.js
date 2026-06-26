import gemini from "@/lib/gemini";

export async function POST(request) {
  const { imageBase64, mimeType = "image/jpeg", transcript = "" } = await request.json();

  if (!imageBase64) {
    return Response.json({ error: "No image provided" }, { status: 400 });
  }

  if (!process.env.GEMINI_API_KEY) {
    console.error("[analyze-image] GEMINI_API_KEY is not set");
    return Response.json({ content_type: "other", description: "", extracted_text: null, key_concepts: [], gaps: null }, { status: 500 });
  }

  console.log(`[analyze-image] processing: mimeType=${mimeType}, imageSize=${Math.round(imageBase64.length * 0.75 / 1024)}KB, transcriptLen=${transcript.length}`);

  const model = gemini.getGenerativeModel({ model: "gemini-2.0-flash" });

  const transcriptContext = transcript.length > 2000 ? transcript.slice(-2000) : transcript;

  const prompt = `Eres un asistente educativo analizando material visual capturado durante una clase o conferencia.

TRANSCRIPCIÓN ACTUAL (últimas palabras del profesor):
${transcriptContext || "(sin transcripción todavía)"}

Analiza la imagen y responde ÚNICAMENTE en JSON válido con este formato exacto (sin bloques de código, sin markdown):
{
  "content_type": "uno de: whiteboard | slide | diagram | graph | formula | table | screenshot | photo | other",
  "description": "descripción concisa en español de qué muestra la imagen en el contexto de la clase, máximo 80 palabras",
  "extracted_text": "TODO el texto legible en la imagen transcrito con exactitud: fórmulas, ecuaciones, términos, datos numéricos, labels de gráficos, texto en pizarrón o diapositiva. Si no hay texto visible, devuelve null",
  "key_concepts": ["concepto clave 1", "concepto clave 2"],
  "gaps": "información visible en la imagen que NO aparece en la transcripción — fórmulas, términos, datos que el profesor señaló sin mencionar verbalmente. Si no hay gaps relevantes, devuelve null"
}

Instrucciones de clasificación:
- whiteboard: pizarrón con texto/dibujos
- slide: diapositiva de presentación
- diagram: diagrama, esquema, árbol conceptual
- graph: gráfica estadística, función matemática, scatter plot
- formula: ecuación o fórmula matemática/química prominente
- table: tabla de datos
- screenshot: captura de pantalla de software, código o interfaz
- photo: fotografía de objeto/persona real
- other: cualquier otro visual`;

  try {
    const result = await model.generateContent([
      { text: prompt },
      { inlineData: { data: imageBase64, mimeType } },
    ]);

    let text = result.response.text().trim();
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("No JSON found");
      parsed = JSON.parse(match[0]);
    }

    const validTypes = ["whiteboard", "slide", "diagram", "graph", "formula", "table", "screenshot", "photo", "other"];

    const result = {
      content_type: validTypes.includes(parsed.content_type) ? parsed.content_type : "other",
      description: parsed.description || "",
      extracted_text: parsed.extracted_text && parsed.extracted_text !== "null" ? parsed.extracted_text : null,
      key_concepts: Array.isArray(parsed.key_concepts) ? parsed.key_concepts : [],
      gaps: parsed.gaps && parsed.gaps !== "null" ? parsed.gaps : null,
    };
    console.log(`[analyze-image] OK: type=${result.content_type}, hasOCR=${!!result.extracted_text}, concepts=${result.key_concepts.length}`);
    return Response.json(result);
  } catch (e) {
    console.error("[analyze-image] error:", e?.message || e);
    return Response.json(
      { content_type: "other", description: "", extracted_text: null, key_concepts: [], gaps: null },
      { status: 500 }
    );
  }
}
