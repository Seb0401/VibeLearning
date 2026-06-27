import { groq } from "@/lib/groq";

export async function POST(req) {
  const { title, concepts, transcript } = await req.json();

  const conceptText = (concepts || [])
    .slice(0, 20)
    .map(c => `- ${typeof c === "string" ? c : `${c.name}: ${c.summary || ""}`}`)
    .join("\n");

  const snippet = (transcript || "").trim().split(/\s+/).slice(0, 1200).join(" ");

  const completion = await groq.chat.completions.create({
    model: "openai/gpt-oss-120b",
    messages: [{
      role: "user",
      content: `Crea un cheat sheet compacto para estudiar la clase "${title}".

CONCEPTOS:
${conceptText}

EXTRACTO:
${snippet}

REGLAS — síguelas al pie de la letra:
- Usa ## para secciones (3-5 secciones máximo)
- Bullets cortos: término **en negrita** → definición en 1 línea
- Incluye fórmulas, pasos o listas clave si las hay
- Sin párrafos. Sin introducción. Sin conclusión.
- 350-500 palabras total
- Responde ÚNICAMENTE con el cheat sheet en markdown`,
    }],
    max_tokens: 900,
    temperature: 0.15,
  });

  const markdown = completion.choices[0]?.message?.content?.trim() ?? "";
  return Response.json({ markdown });
}
