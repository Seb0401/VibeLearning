import { groq } from "@/lib/groq";
import pdfParse from "pdf-parse/lib/pdf-parse.js";

const SYSTEM = `Eres un asistente educativo. Resume el siguiente material de estudio de forma compacta.
Extrae los puntos más importantes en 150-200 palabras. Sin listas largas, solo los conceptos esenciales
que sirvan de contexto para responder preguntas del alumno.`;

export async function POST(request) {
  try {
    const formData = await request.formData();
    const pdf = formData.get("pdf");
    if (!pdf) {
      return Response.json({ error: "No PDF" }, { status: 400 });
    }

    const arrayBuffer = await pdf.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const { text } = await pdfParse(buffer);

    const completion = await groq.chat.completions.create({
      model: "openai/gpt-oss-120b",
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: text.slice(0, 8000) },
      ],
      max_tokens: 300,
      temperature: 0.3,
    });

    const summary = completion.choices?.[0]?.message?.content?.trim() ?? "";
    return Response.json({ summary });
  } catch (err) {
    if (err?.status === 429 || err?.error?.code === "rate_limit_exceeded") {
      return Response.json({ skip: true });
    }
    console.error("[upload-material]", err);
    return Response.json({ error: "upload-material failed" }, { status: 500 });
  }
}
