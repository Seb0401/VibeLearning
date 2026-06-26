import gemini from "@/lib/gemini";

export async function POST(request) {
  const { imageBase64, mimeType = "image/jpeg", transcript = "" } = await request.json();

  if (!imageBase64) {
    return Response.json({ error: "No image provided" }, { status: 400 });
  }

  const model = gemini.getGenerativeModel({ model: "gemini-2.0-flash" });

  const transcriptContext = transcript.length > 2000 ? transcript.slice(-2000) : transcript;

  const prompt = `Eres un asistente educativo analizando material visual de una clase o conferencia.

TRANSCRIPCIÓN ACTUAL (últimas palabras del profesor):
${transcriptContext || "(sin transcripción todavía)"}

Analiza la imagen adjunta en el contexto de esta clase y responde ÚNICAMENTE en JSON con este formato exacto (sin bloques de código, sin markdown):
{
  "description": "descripción concisa de lo que muestra la imagen en contexto de la clase, máximo 80 palabras",
  "key_concepts": ["concepto 1", "concepto 2"],
  "gaps": "información visible en la imagen que NO aparece en la transcripción — fórmulas, términos técnicos, datos numéricos, diagramas, texto en pizarrón o diapositiva que el profesor señaló sin mencionar verbalmente. Si no hay gaps relevantes, devuelve null"
}`;

  try {
    const result = await model.generateContent([
      { text: prompt },
      { inlineData: { data: imageBase64, mimeType } },
    ]);

    let text = result.response.text().trim();
    // Strip markdown code fences if present
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      // Second attempt: extract first JSON object from the response
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("No JSON found");
      parsed = JSON.parse(match[0]);
    }

    return Response.json({
      description: parsed.description || "",
      key_concepts: Array.isArray(parsed.key_concepts) ? parsed.key_concepts : [],
      gaps: parsed.gaps && parsed.gaps !== "null" ? parsed.gaps : null,
    });
  } catch (e) {
    console.error("[analyze-image]", e);
    return Response.json(
      { description: "", key_concepts: [], gaps: null, error: "Error al analizar la imagen" },
      { status: 500 }
    );
  }
}
