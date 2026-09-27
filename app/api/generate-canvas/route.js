import { groq } from "@/lib/groq";

function parseJSON(raw) {
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("no JSON");
  return JSON.parse(m[0]);
}

// Primero el agent-service (FastAPI + Google ADK). Devuelve {nodes} o null si no está disponible.
async function askAgent(body) {
  const agentUrl = process.env.AGENT_SERVICE_URL || "http://localhost:8080";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(`${agentUrl}/generate-canvas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) {
      console.error("[generate-canvas] agent error:", response.status);
      return null;
    }
    const data = await response.json();
    return data?.nodes?.length ? data : null;
  } catch (err) {
    console.warn("[generate-canvas] agent no disponible, usando Groq:", err?.message);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// Paracaídas: mismo prompt y formato que el agente, con Groq.
async function askGroq({ transcript = "", material_summary = "", concepts = [], chat_history = "" }) {
  const words = transcript.trim().split(/\s+/);
  const shortTranscript = words.length > 3000 ? words.slice(-3000).join(" ") : transcript;

  const prompt = `Eres un asistente educativo. Analiza esta información de una clase:

TRANSCRIPT: """${shortTranscript}"""
MATERIAL: """${material_summary}"""
CONCEPTOS CLAVE: ${JSON.stringify(concepts)}
CHAT DEL ESTUDIANTE: """${chat_history}"""

Extrae entre 6 y 12 conceptos importantes y sus relaciones. Para cada concepto genera:
- "id": único (n1, n2, ...)
- "label": nombre corto
- "summary": resumen de 1-2 oraciones
- "connections": lista de ids relacionados (solo ids que existan)
- "image_query": término de búsqueda en inglés para una imagen representativa
- "video_query": término de búsqueda en inglés para YouTube

IMPORTANTE: "label" y "summary" van en ESPAÑOL; solo "image_query" y "video_query" van en inglés.
Responde SOLO con JSON: {"nodes":[{"id":"n1","label":"...","summary":"...","connections":["n2"],"image_query":"...","video_query":"..."}]}`;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const completion = await groq.chat.completions.create({
        model: "openai/gpt-oss-120b",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 2000,
      });
      const parsed = parseJSON(completion.choices[0]?.message?.content ?? "");
      if (!Array.isArray(parsed.nodes) || !parsed.nodes.length) continue;
      const ids = new Set(parsed.nodes.map((n) => n.id));
      const nodes = parsed.nodes.map((n) => ({
        ...n,
        connections: (n.connections || []).filter((c) => ids.has(c) && c !== n.id),
      }));
      return { nodes };
    } catch (err) {
      if (err?.status === 429) return { skip: true };
      if (attempt === 2) console.error("[generate-canvas] groq error:", err);
    }
  }
  return null;
}

export async function POST(req) {
  try {
    const body = await req.json();

    const agentResult = await askAgent(body);
    if (agentResult) return Response.json(agentResult);

    const groqResult = await askGroq(body);
    if (groqResult?.nodes) return Response.json(groqResult);
    if (groqResult?.skip) return Response.json({ skip: true });

    return Response.json({ error: "canvas generation failed" }, { status: 500 });
  } catch (err) {
    console.error("[generate-canvas] error:", err);
    return Response.json({ error: "canvas generation failed" }, { status: 500 });
  }
}
