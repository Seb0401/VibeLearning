export async function POST(req) {
  try {
    const body = await req.json();
    const agentUrl = process.env.AGENT_SERVICE_URL || "http://localhost:8080";
    
    const response = await fetch(`${agentUrl}/generate-canvas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if (!response.ok) throw new Error(`Agent error ${response.status}`);
    
    const data = await response.json();
    return Response.json(data, {
      headers: { "Content-Type": "application/json; charset=utf-8" }
    });
  } catch (err) {
    console.error("[generate-canvas] error:", err);
    return Response.json({ error: "canvas generation failed" }, { status: 500 });
  }
}
