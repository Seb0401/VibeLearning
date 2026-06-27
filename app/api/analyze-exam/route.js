import { groq } from "@/lib/groq";
import pdfParse from "pdf-parse";

async function extractText(file) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const parsed = await pdfParse(buffer);
  return parsed.text.slice(0, 5000);
}

function buildTextPrompt(examText, instrText, subject, grade) {
  const instrSection = instrText
    ? `\nINDICACIONES / RÚBRICA DEL PROFESOR:\n${instrText}\n`
    : "";
  return `Analiza este examen del estudiante.${subject ? ` Materia: ${subject}.` : ""}${grade ? ` Nota obtenida: ${grade}.` : ""}
${instrSection}
CONTENIDO DEL EXAMEN:
${examText}

Evalúa cada pregunta considerando las indicaciones del profesor si las hay.
Responde SOLO con JSON válido:
{
  "score_detected": "nota visible en el documento o null",
  "total_questions": número,
  "correct": número,
  "questions": [
    {
      "number": 1,
      "question": "enunciado completo",
      "student_answer": "respuesta del estudiante",
      "correct_answer": "respuesta correcta o null si no se puede determinar",
      "is_correct": true,
      "feedback": "retroalimentación específica"
    }
  ],
  "overall_feedback": "evaluación general del desempeño",
  "topics_to_review": ["tema1", "tema2"]
}`;
}

function buildImagePrompt(instrText, subject, grade) {
  const instrSection = instrText
    ? `\nINDICACIONES DEL PROFESOR:\n${instrText}`
    : "";
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
  const form        = await req.formData();
  const file        = form.get("file");
  const subject     = form.get("subject")          || "";
  const grade       = form.get("given_grade")       || "";
  const instrText   = form.get("instructions_text") || "";
  const instrPDF    = form.get("instructions_pdf");

  if (!file) return Response.json({ error: "No file uploaded" }, { status: 400 });

  // Extract instructor instructions from PDF if provided
  let instructions = instrText;
  if (!instructions && instrPDF && instrPDF.size > 0) {
    try {
      const buf    = Buffer.from(await instrPDF.arrayBuffer());
      const parsed = await pdfParse(buf);
      instructions = parsed.text.slice(0, 2000);
    } catch {}
  }

  const isPDF = file.type === "application/pdf" || file.name?.toLowerCase().endsWith(".pdf");

  try {
    let result;

    if (isPDF) {
      const text = await extractText(file);
      const r = await groq.chat.completions.create({
        model: "openai/gpt-oss-120b",
        messages: [{ role: "user", content: buildTextPrompt(text, instructions, subject, grade) }],
        max_tokens: 2500,
        temperature: 0.1,
      });
      result = parseJSON(r.choices[0].message.content);
    } else {
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
