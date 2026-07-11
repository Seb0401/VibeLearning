import { groq } from "@/lib/groq";

// Lazy-load pdf-parse to avoid crash when the module isn't installed
async function parsePDF(buffer) {
  try {
    const { createRequire } = await import("module");
    const { fileURLToPath } = await import("url");
    const r = createRequire(fileURLToPath(import.meta.url));
    const pdfParse = r("pdf-parse");
    const parsed = await pdfParse(buffer);
    return parsed.text;
  } catch {
    // Module not installed or wrong version — signal the caller
    return null;
  }
}

function buildTextPrompt(examText, instrText, subject, grade) {
  const instrSection = instrText
    ? `\nINDICACIONES / RÚBRICA DEL PROFESOR:\n${instrText}\n`
    : "";
  return `Analiza este examen del estudiante.${subject ? ` Materia: ${subject}.` : ""}${grade ? ` Nota obtenida: ${grade}.` : ""}
${instrSection}
CONTENIDO DEL EXAMEN:
${examText}

Evalúa cada pregunta. Responde SOLO con JSON válido:
{
  "score_detected": "nota visible en el documento o null",
  "total_questions": número,
  "correct": número,
  "questions": [
    {
      "number": 1,
      "question": "enunciado completo",
      "student_answer": "respuesta del estudiante",
      "correct_answer": "respuesta correcta o null",
      "is_correct": true,
      "feedback": "retroalimentación específica"
    }
  ],
  "overall_feedback": "evaluación general del desempeño",
  "topics_to_review": ["tema1", "tema2"]
}`;
}

function buildImagePrompt(instrText, subject, grade) {
  const instrSection = instrText ? `\nINDICACIONES DEL PROFESOR:\n${instrText}` : "";
  return `Lee este examen del estudiante y evalúa cada pregunta.${subject ? ` Materia: ${subject}.` : ""}${grade ? ` Nota del estudiante: ${grade}.` : ""}${instrSection}

Si hay una calificación visible en el examen, identifícala.
Responde SOLO con JSON:
{
  "score_detected": "nota visible o null",
  "total_questions": número,
  "correct": número,
  "questions": [
    {
      "number": 1,
      "question": "enunciado",
      "student_answer": "respuesta del estudiante",
      "correct_answer": "respuesta correcta o null",
      "is_correct": true,
      "feedback": "retroalimentación en español"
    }
  ],
  "overall_feedback": "evaluación general",
  "topics_to_review": ["tema1"]
}`;
}

function parseJSON(raw) {
  const clean = raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  const m     = clean.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("No JSON in response");
  return JSON.parse(m[0]);
}

export async function POST(req) {
  const form      = await req.formData();
  const file      = form.get("file");
  const subject   = form.get("subject")          || "";
  const grade     = form.get("given_grade")       || "";
  const instrText = form.get("instructions_text") || "";
  const instrPDF  = form.get("instructions_pdf");

  if (!file) return Response.json({ error: "No file uploaded" }, { status: 400 });

  const isPDF = file.type === "application/pdf" || file.name?.toLowerCase().endsWith(".pdf");

  // Extract instructor instructions (PDF takes priority over text if both sent)
  let instructions = instrText;
  if (!instructions && instrPDF && instrPDF.size > 0) {
    if (!isPDF) {
      // Only attempt PDF parse for instruction files; if unavailable, skip silently
      const buf = Buffer.from(await instrPDF.arrayBuffer());
      const txt = await parsePDF(buf);
      if (txt) instructions = txt.slice(0, 2000);
    }
  }

  try {
    let result;

    if (isPDF) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const text   = await parsePDF(buffer);

      if (!text) {
        return Response.json({
          error: "PDF no soportado en esta instalación. Sube una foto (JPG/PNG) del examen, o ejecuta en la terminal: npm install pdf-parse@1.1.1 --ignore-scripts",
        }, { status: 422 });
      }

      const r = await groq.chat.completions.create({
        model: "openai/gpt-oss-120b",
        messages: [{ role: "user", content: buildTextPrompt(text.slice(0, 5000), instructions, subject, grade) }],
        max_tokens: 2500,
        temperature: 0.1,
      });
      result = parseJSON(r.choices[0].message.content);
    } else {
      // Image — use Groq vision model
      const buffer = Buffer.from(await file.arrayBuffer());
      const b64    = buffer.toString("base64");
      const mime   = file.type || "image/jpeg";

      const r = await groq.chat.completions.create({
        model: "qwen/qwen3.6-27b",
        messages: [{
          role: "user",
          content: [
            { type: "image_url", image_url: { url: `data:${mime};base64,${b64}` } },
            { type: "text", text: buildImagePrompt(instructions, subject, grade) },
          ],
        }],
        max_tokens: 2500,
        temperature: 0.1,
      });
      result = parseJSON(r.choices[0].message.content);
    }

    return Response.json({ ...result, given_grade: grade || null });
  } catch (e) {
    console.error("[analyze-exam]", e);
    return Response.json({ error: e.message || "Error al analizar el examen" }, { status: 500 });
  }
}
