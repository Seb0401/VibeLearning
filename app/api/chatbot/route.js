import { groq } from "@/lib/groq";

function stripMarkdown(text) {
  return text
    .replace(/#{1,6}\s*/g, "")      // headers
    .replace(/\*\*(.+?)\*\*/g, "$1") // bold
    .replace(/\*(.+?)\*/g, "$1")     // italic
    .replace(/`(.+?)`/g, "$1")       // inline code
    .replace(/[-*+]\s+/g, "")        // list bullets
    .replace(/\n{2,}/g, " ")         // doble salto → espacio
    .replace(/\n/g, " ")             // salto simple → espacio
    .trim();
}

// Agente de subagentes (FastAPI + Google ADK). Devuelve {answer, source} o null si falla.
async function askAgent({ question, transcript, material_summary }) {
  const agentServiceUrl = process.env.AGENT_SERVICE_URL || "http://localhost:8080";

  // Timeout para no colgar la demo si el servicio está frío o caído.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(`${agentServiceUrl}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, transcript, material_summary }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[chatbot] agent service error:", response.status, errorText);
      return null;
    }

    const data = await response.json();
    const answer = stripMarkdown(data.answer ?? "");
    if (!answer) return null;

    return { answer, source: data.source ?? "rag_local" };
  } catch (err) {
    console.error("[chatbot] agent unreachable, fallback to Groq:", err?.name || err);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// Paracaídas: chatbot original con Groq. Devuelve {answer, source} o null si falla.
async function askGroq({ question, transcript, material_summary }) {
  const transcriptWords = (transcript ?? "").split(/\s+/);
  const transcriptTruncated = transcriptWords.slice(-3000).join(" ");
  const material = material_summary?.trim() || "No se subió material.";

  const prompt = `Eres un asistente educativo dentro de una clase en vivo.
Material: """${material}"""
Transcripción hasta ahora (últimas ~3000 palabras): """${transcriptTruncated}"""
Pregunta del estudiante: "${question}"
Responde en texto plano, SIN markdown, SIN JSON, solo la respuesta directa. Máximo 2-3 oraciones, máximo 50 palabras salvo que pidan más detalle. Ve directo a la idea. Si no se puede responder con el contexto, dilo honestamente.`;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const completion = await groq.chat.completions.create({
        model: "openai/gpt-oss-120b",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 160,
      });

      const rawText = completion.choices[0]?.message?.content ?? "";
      const cleaned = rawText
        .trim()
        .replace(/\*\*/g, "")
        .replace(/^#+\s*/gm, "")
        .replace(/^-\s+/gm, "")
        .replace(/^\{?"?answer"?:?\s*"?/i, "")
        .replace(/"?\}?$/g, "")
        .trim();

      if (cleaned) return { answer: cleaned, source: "groq_fallback" };
    } catch (innerErr) {
      if (innerErr?.status === 429 || innerErr?.message?.includes("429")) return null;
      if (attempt === 2) return null;
    }
  }
  return null;
}

export async function POST(req) {
  try {
    const { question, material_summary, transcript } = await req.json();

    if (!question) {
      return Response.json({ error: "missing question" }, { status: 400 });
    }

    // 1) Intentamos el agente de subagentes (la feature nueva).
    const agentResult = await askAgent({ question, transcript, material_summary });
    if (agentResult) {
      return Response.json(agentResult);
    }

    // 2) Si el agente no respondió, paracaídas a Groq para que la demo nunca se quede muda.
    const groqResult = await askGroq({ question, transcript, material_summary });
    if (groqResult) {
      return Response.json(groqResult);
    }

    // 3) Ni el agente ni Groq respondieron: skip silencioso (no crashea la UI).
    return Response.json({ skip: true });
  } catch (err) {
    if (err?.status === 429 || err?.message?.includes("429")) {
      return Response.json({ skip: true });
    }
    console.error("[chatbot] error:", err);
    return Response.json({ error: "chatbot failed" }, { status: 500 });
  }
}
