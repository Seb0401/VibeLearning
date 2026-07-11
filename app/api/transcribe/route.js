import { groq } from "@/lib/groq";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const audio = formData.get("audio");
    if (!audio) {
      return Response.json({ error: "No audio" }, { status: 400 });
    }

    const transcription = await groq.audio.transcriptions.create({
      file: audio,
      model: "whisper-large-v3-turbo",
      response_format: "json",
      language: "es",
    });

    return Response.json({ text: transcription.text ?? "" });
  } catch (err) {
    if (err?.status === 429 || err?.error?.code === "rate_limit_exceeded") {
      return Response.json({ skip: true });
    }
    console.error("[transcribe]", err);
    return Response.json({ error: "transcribe failed" }, { status: 500 });
  }
}
