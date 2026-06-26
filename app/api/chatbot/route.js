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

export async function POST(req) {
  try {
    const { question, material_summary, transcript } = await req.json();

    if (!question) {
      return Response.json({ error: "missing question" }, { status: 400 });
    }

    const agentServiceUrl = process.env.AGENT_SERVICE_URL || "http://localhost:8080";

    const response = await fetch(`${agentServiceUrl}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question,
        transcript,
        material_summary,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[chatbot] agent service error:", errorText);
      return Response.json({ error: "agent-service failed" }, { status: response.status });
    }

    const data = await response.json();
    const answer = stripMarkdown(data.answer ?? "");

    return Response.json({ answer });
  } catch (err) {
    console.error("[chatbot] error:", err);
    return Response.json({ error: "chatbot failed" }, { status: 500 });
  }
}
