# Contrato: POST /api/analyze-material (P3 — branch feature/multimedia-gemini)

## Request
```
FormData campo "file" → JPG | PNG | WEBP | PDF
```

## Response exitosa
```json
{
  "summary":  "## Tema\n**Concepto** explicación...",
  "mindmap":  "# Tema raíz\n## Rama 1\n### Sub-rama\n## Rama 2",
  "timeline": [
    { "order": 1, "concept": "Nombre", "description": "Una oración." },
    { "order": 2, "concept": "Nombre", "description": "Una oración." }
  ]
}
```

## Response de resiliencia (rate limit o error)
```json
{ "skip": true }
```

## Cómo renderizarlo en el frontend (P1)

### summary
```jsx
import ReactMarkdown from "react-markdown";
<ReactMarkdown>{data.summary}</ReactMarkdown>
```

### mindmap
```jsx
import MindMap from "@/components/MindMap";
<MindMap markdown={data.mindmap} />
```

### timeline
```jsx
{data.timeline.map((item) => (
  <div key={item.order}>
    <span>{item.order}. {item.concept}</span>
    <p>{item.description}</p>
  </div>
))}
```

## Archivos modificados (solo P3)
- `app/api/analyze-material/route.js` ← NUEVO (no pisa nada de P1 ni P2)

## Dependencia nueva (ejecutar una vez)
```bash
npm install @google/genai
```

## Variable de entorno requerida
```
GEMINI_API_KEY=tu_clave_de_google_ai_studio
```
Agregar también en Vercel → Environment Variables antes del deploy.

## MIME types soportados
- `image/jpeg`, `image/png`, `image/webp`, `image/gif`
- `application/pdf`

## Diferencia con /api/upload-material (P2)
- `/api/upload-material` (P2): procesa solo PDF con pdf-parse + Groq, devuelve `{summary: string}`
- `/api/analyze-material` (P3): procesa imagen O PDF con Gemini Vision, devuelve `{summary, mindmap, timeline}`
Son endpoints distintos, no se pisan.
