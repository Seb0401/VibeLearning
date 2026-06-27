import { groq } from "@/lib/groq";

function parseJSON(raw) {
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("no JSON");
  return JSON.parse(m[0]);
}

// Baraja las opciones para que la respuesta correcta caiga en una letra aleatoria
// (los modelos tienden a sesgar la correcta hacia A/B).
function shuffleAnswer(parsed) {
  const letters = ["A", "B", "C"];
  const correctText = parsed.options?.[parsed.correct];
  const texts = letters
    .map((l) => parsed.options?.[l])
    .filter((t) => t != null && t !== "");

  // Fisher-Yates
  for (let i = texts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [texts[i], texts[j]] = [texts[j], texts[i]];
  }

  const options = {};
  let correct = parsed.correct;
  texts.forEach((t, i) => {
    const letter = letters[i];
    options[letter] = t;
    if (t === correctText) correct = letter;
  });

  return { ...parsed, options, correct };
}

export async function POST(req) {
  try {
    const { concepts = [], transcript = "" } = await req.json();

    const cleanTranscript = (transcript || "").trim();
    if (!cleanTranscript && (!concepts || concepts.length === 0)) {
      return Response.json({ error: "no content provided" }, { status: 400 });
    }

    const conceptsHint = concepts?.length
      ? `Conceptos clave ya detectados (úsalos solo si encajan con el fragmento): ${JSON.stringify(concepts)}`
      : "";

    const prompt = `Eres un tutor que confirma EN VIVO la comprensión de una clase.
Fragmento reciente de lo que el profesor acaba de explicar:
"""${cleanTranscript.slice(-1500)}"""
${conceptsHint}

Genera UNA pregunta de opción múltiple (A, B, C) MUY sencilla sobre la IDEA PRINCIPAL de este fragmento, para confirmar que el alumno entendió lo que se acaba de decir.
Reglas:
- Pregunta directa de comprensión, en lenguaje claro; se lee y responde en menos de 10 segundos.
- No preguntes por detalles triviales ni datos rebuscados; enfócate en la idea central de lo dicho.
- Cada opción de máximo una línea, sin opciones-trampa absurdas.
- "concept": el tema o idea concreta que evalúa la pregunta (pocas palabras).
- "explanation": UNA sola frase corta (máx ~15 palabras) que diga por qué la correcta lo es.
Responde SOLO con JSON: {"concept":"...","question":"...","options":{"A":"...","B":"...","C":"..."},"correct":"A","explanation":"..."}`;

    let raw = "";

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const completion = await groq.chat.completions.create({
          model: "openai/gpt-oss-20b",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 350,
        });

        raw = completion.choices[0]?.message?.content ?? "";

        const parsed = parseJSON(raw);

        // Validar estructura mínima
        if (
          parsed.concept &&
          parsed.question &&
          parsed.options?.A &&
          parsed.options?.B &&
          parsed.options?.C &&
          parsed.correct &&
          parsed.options[parsed.correct]
        ) {
          return Response.json(shuffleAnswer(parsed));
        }

        // Si la estructura no es válida, reintentamos
        if (attempt === 2) {
          return Response.json({ skip: true });
        }
      } catch (parseErr) {
        if (attempt === 2) {
          return Response.json({ skip: true });
        }
        // Reintento silencioso
      }
    }

    return Response.json({ skip: true });
  } catch (err) {
    if (err?.status === 429 || err?.message?.includes("429")) {
      return Response.json({ skip: true });
    }
    console.error("[quiz] error:", err);
    return Response.json({ error: "quiz generation failed" }, { status: 500 });
  }
}
