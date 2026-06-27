import { groq } from "@/lib/groq";

const TEXT_PROMPT = (text, subject, grade) => `
Analiza este examen del estudiante.
${subject ? `Materia: ${subject}.` : ""}
${grade ? `Nota obtenida: ${grade}.` : ""}

CONTENIDO:
${text}

Evalúa cada pregunta. Responde SOLO con JSON exacto:
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

const IMG_PROMPT = (subject, grade) => `
Lee este examen del estudiante y evalúa cada pregunta.
${subject ? `Materia: ${subject}.` : ""}
${grade ? `Nota obtenida: ${grade}.` : ""}

Si hay una calificación visible en el examen, identifícala.
Responde SOLO con JSON exacto:
{
  "score_detected": "nota visible o null",
  "total_questions": número,
  "correct": número,
  "questions": [
    {
      "number": 1,
      "question": "enunciado",
      "student_answer": "respuesta del estudiante",
      "correct_answer": "respuesta correcta o null si no se puede determinar",
      "is_correct": true,
      "feedback": "retroalimentación específica en español"
    }
  ],
  "overall_feedback": "evaluación general del desempeño",
  "topics_to_review": ["tema1", "tema2"]
}`;

function parseJSON(raw) {
  const clean = raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  const m     = clean.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("No JSON in response");
  return JSON.parse(m[0]);
}

export async function POST(req) {
  const form      = await req.formData();
  const file      = form.get("file");
  const subject   = form.get("subject")     || "";
  const grade     = form.get("given_grade") || "";

  if (!file) return Response.json({ error: "No file uploaded" }, { status: 400 });

  const isPDF = file.type === "application/pdf" || file.name?.toLowerCase().endsWith(".pdf");

  try {
    let result;

    if (isPDF) {
      const buffer   = Buffer.from(await file.arrayBuffer());
      const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default;
      const parsed   = await pdfParse(buffer);
      const text     = parsed.text.slice(0, 5000);

      const r = await groq.chat.completions.create({
        model: "openai/gpt-oss-120b",
        messages: [{ role: "user", content: TEXT_PROMPT(text, subject, grade) }],
        max_tokens: 2500,
        temperature: 0.1,
      });
      result = parseJSON(r.choices[0].message.content);
    } else {
      const buffer  = Buffer.from(await file.arrayBuffer());
      const b64     = buffer.toString("base64");
      const mime    = file.type || "image/jpeg";

      const r = await groq.chat.completions.create({
        model: "qwen/qwen3.6-27b",
        messages: [{
          role: "user",
          content: [
            { type: "image_url", image_url: { url: `data:${mime};base64,${b64}` } },
            { type: "text", text: IMG_PROMPT(subject, grade) },
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
