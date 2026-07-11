import { groq } from "@/lib/groq";

function buildSystem(existingConcepts = []) {
  const existingList = existingConcepts.length
    ? existingConcepts.join(", ")
    : "ninguno";
  return `Eres un asistente educativo analizando un fragmento de transcripción de una clase en vivo (puede venir cortado a mitad de frase por los ciclos de captura).

TU TRABAJO: identificar los conceptos educativos genuinos que se están discutiendo, aunque el profesor no los haya definido formalmente palabra por palabra — usa tu propio criterio para reconocer de qué tema se está hablando. Si un término te resulta ambiguo, mal transcrito, o no estás seguro de su definición exacta, puedes buscar en la web para confirmarlo o precisar el resumen antes de incluirlo.

FILTRO DE CALIDAD — descarta:
- Muletillas, saludos, comentarios logísticos ("hoy vamos a ver", "como les decía", "ya casi terminamos")
- Palabras sueltas sin sustancia educativa o que no tengan sentido como concepto por sí solas
- Nombres propios de personas/lugares que no sean en sí el tema de la clase
- Cualquier cosa que no podrías explicarle a un estudiante en 1-2 oraciones con contenido real

Elige MÁXIMO 3 conceptos (o menos si no hay suficientes con sustancia real). Es preferible devolver pocos o ninguno antes que inventar o forzar conceptos débiles.

Conceptos ya extraídos — NO los repitas ni parafrasees: ${existingList}

Responde ÚNICAMENTE con JSON válido, sin markdown ni texto extra.
Formato exacto: {"concepts":[{"name":"...","summary":"..."}]}
Si no hay conceptos nuevos con sustancia real, devuelve: {"concepts":[]}
Resumen de cada uno: 1-2 oraciones en lenguaje simple.`;
}

function parseConceptsJSON(raw) {
  let text = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1) text = text.slice(start, end + 1);
  return JSON.parse(text);
}

export async function POST(request) {
  try {
    const { transcript, existing_concepts = [] } = await request.json();
    if (!transcript) {
      return Response.json({ concepts: [] });
    }

    const system = buildSystem(existing_concepts);

    // compound-mini puede buscar en la web por su cuenta cuando el modelo lo considera
    // necesario para confirmar o precisar un concepto — sin que nosotros orquestemos esa
    // llamada aparte. Si no la necesita, responde igual de rápido que un modelo normal.
    const completion = await groq.chat.completions.create({
      model: "groq/compound-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: `Transcripción:\n${transcript.slice(0, 4000)}` },
      ],
      max_tokens: 400,
      temperature: 0.3,
    });

    const raw = completion.choices?.[0]?.message?.content ?? "";

    try {
      const parsed = parseConceptsJSON(raw);
      return Response.json({ concepts: parsed.concepts ?? [] });
    } catch {
      const repair = await groq.chat.completions.create({
        model: "openai/gpt-oss-20b",
        messages: [
          { role: "system", content: system },
          { role: "user", content: `Transcripción:\n${transcript.slice(0, 4000)}` },
          { role: "assistant", content: raw },
          { role: "user", content: "El JSON anterior no es válido. Devuelve SOLO el JSON corregido." },
        ],
        max_tokens: 400,
        temperature: 0,
      });
      const raw2 = repair.choices?.[0]?.message?.content ?? "";
      try {
        const parsed2 = parseConceptsJSON(raw2);
        return Response.json({ concepts: parsed2.concepts ?? [] });
      } catch {
        return Response.json({ concepts: [] });
      }
    }
  } catch (err) {
    if (err?.status === 429 || err?.error?.code === "rate_limit_exceeded") {
      return Response.json({ skip: true });
    }
    console.error("[concepts]", err);
    return Response.json({ error: "concepts failed" }, { status: 500 });
  }
}
