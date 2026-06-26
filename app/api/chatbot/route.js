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

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
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
          console.error(`[chatbot] agent service error (attempt ${attempt}):`, errorText);
          if (attempt === 2) {
            return Response.json({ skip: true });
          }
          continue;
        }

        const data = await response.json();
        const rawAnswer = data.answer ?? "";
        const answer = stripMarkdown(rawAnswer);
        const source = data.source ?? "rag_local";

        if (answer) {
          return Response.json({ answer, source });
        }

        if (attempt === 2) {
          return Response.json({ skip: true });
        }
      } catch (innerErr) {
        console.error(`[chatbot] inner error (attempt ${attempt}):`, innerErr);
        if (attempt === 2) {
          return Response.json({ skip: true });
        }
      }
    }

    return Response.json({ skip: true });
  } catch (err) {
    if (err?.status === 429 || err?.message?.includes("429")) {
      return Response.json({ skip: true });
    }
    console.error("[chatbot] error:", err);
    return Response.json({ error: "chatbot failed" }, { status: 500 });
  }
}
