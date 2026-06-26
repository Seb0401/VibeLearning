import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const PROMPT = `Eres un asistente educativo experto. Analiza el contenido del archivo adjunto (puede ser una imagen de apuntes, una foto de pizarrón, o un documento PDF) y genera EXACTAMENTE este JSON sin texto adicional:

{
  "summary": "Resumen en markdown con ## para secciones y **bold** para términos clave. Máximo 300 palabras. Organizado por temas encontrados en el material.",
  "mindmap": "Mapa mental como lista jerárquica markdown compatible con markmap. Usa # para el tema raíz, ## para ramas principales, ### para sub-ramas. Mínimo 3 niveles de profundidad.",
  "timeline": [
    { "order": 1, "concept": "Nombre del concepto", "description": "Una oración clara que explica qué es y por qué viene en este orden lógico." }
  ]
}

Reglas estrictas:
- summary: markdown puro, denso en información, sin relleno.
- mindmap: SOLO lista jerárquica markdown, sin explicaciones extra.
- timeline: array JSON ordenado del concepto más fundamental al más avanzado o derivado. Mínimo 4 items, máximo 10.
- Responde ÚNICAMENTE con el JSON. Sin bloques de código, sin explicaciones, sin texto antes o después.`;

async function fileToInlineBase64(file) {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return {
    inlineData: {
      data: buffer.toString("base64"),
      mimeType: file.type,
    },
  };
}

async function pdfToFilePart(file) {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Subir a File API de Gemini para PDFs (evita límite de tamaño en inline)
  const uploadedFile = await ai.files.upload({
    file: new Blob([buffer], { type: "application/pdf" }),
    config: { mimeType: "application/pdf" },
  });

  // Esperar a que el archivo esté listo
  let fileInfo = uploadedFile;
  let attempts = 0;
  while (fileInfo.state === "PROCESSING" && attempts < 10) {
    await new Promise((r) => setTimeout(r, 2000));
    fileInfo = await ai.files.get({ name: uploadedFile.name });
    attempts++;
  }

  if (fileInfo.state === "FAILED") {
    throw new Error("Gemini File API: procesamiento fallido");
  }

  return {
    fileData: {
      fileUri: fileInfo.uri,
      mimeType: "application/pdf",
    },
  };
}

function parseJSON(raw) {
  // Intentar parsear directo
  try {
    return JSON.parse(raw);
  } catch {}
  // Extraer bloque JSON si viene envuelto
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("no JSON found");
  return JSON.parse(m[0]);
}

function validateOutput(parsed) {
  return (
    typeof parsed.summary === "string" &&
    typeof parsed.mindmap === "string" &&
    Array.isArray(parsed.timeline) &&
    parsed.timeline.length > 0 &&
    parsed.timeline.every(
      (t) =>
        typeof t.order === "number" &&
        typeof t.concept === "string" &&
        typeof t.description === "string"
    )
  );
}

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return Response.json({ error: "no file provided" }, { status: 400 });
    }

    const mimeType = file.type;
    const isPDF = mimeType === "application/pdf";
    const isImage = ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(mimeType);

    if (!isPDF && !isImage) {
      return Response.json(
        { error: `tipo de archivo no soportado: ${mimeType}` },
        { status: 415 }
      );
    }

    // Construir la parte multimedia según el tipo
    const filePart = isPDF
      ? await pdfToFilePart(file)
      : await fileToInlineBase64(file);

    // 2 intentos: si el parse falla en el primero, reintenta
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [
            {
              role: "user",
              parts: [filePart, { text: PROMPT }],
            },
          ],
          config: {
            responseMimeType: "application/json",
            temperature: 0.3, // más determinista para JSON estructurado
          },
        });

        const raw = response.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        const parsed = parseJSON(raw);

        if (validateOutput(parsed)) {
          return Response.json({
            summary: parsed.summary,
            mindmap: parsed.mindmap,
            timeline: parsed.timeline,
          }, {
            headers: { "Content-Type": "application/json; charset=utf-8" }
          });
        }

        if (attempt === 2) {
          console.error("[analyze-material] output inválido:", parsed);
          return Response.json({ skip: true });
        }
      } catch (innerErr) {
        if (attempt === 2) {
          throw innerErr; // lo captura el catch externo
        }
        // reintento silencioso
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    return Response.json({ skip: true });
  } catch (err) {
    // Rate limit de Gemini
    if (
      err?.status === 429 ||
      err?.message?.includes("429") ||
      err?.message?.includes("RESOURCE_EXHAUSTED")
    ) {
      return Response.json({ skip: true });
    }

    console.error("[analyze-material] error:", err);
    return Response.json({ error: "analyze-material failed" }, { status: 500 });
  }
}
