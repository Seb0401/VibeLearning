# CLAUDE.md — VibeLearning

Asistente educativo con IA en tiempo real: transcribe la clase en vivo, extrae conceptos
clave, hace active recall, genera refuerzo cuando el alumno falla, y tiene un chatbot RAG.
Al finalizar, genera resumen high-yield + mapa mental visual. Todo persistido en **Supabase
en la nube** (supabase.com — NO local, NO Supabase CLI, NO config.toml). Con login (Google +
email/contraseña) y dashboard de clases pasadas.

---

## 🤖 LEE ESTO PRIMERO (instrucción para Claude Code)

Tres desarrolladores trabajan en este repo en paralelo, cada uno con su Claude Code, todos
sobre `main`. Al empezar, el desarrollador dirá su rol ("soy P1", "soy P2" o "soy P3"):

- **Edita ÚNICAMENTE los archivos de la columna de ese rol** (sección "Reparto").
- **P2 y P3: sus endpoints NO cambiaron respecto a la versión anterior — no tocan Supabase
  para nada.** Siguen siendo funciones puras: reciben JSON, devuelven JSON. Toda la
  persistencia la maneja P1 desde el frontend.
- Si tu tarea pareciera necesitar tocar un archivo de otro rol, NO lo hagas — el contrato de
  datos ya resuelve esa dependencia.
- Commit + push después de cada feat de tu secuencia. Antes de cada push, `git pull origin main`.

---

## 🎯 Alcance del MVP

- Login (Google OAuth + email/contraseña) vía Supabase Auth.
- Dashboard con las clases pasadas del usuario.
- "Nueva clase" → el loop completo: transcript en vivo, conceptos, active recall, refuerzo,
  upload de PDF, chatbot RAG.
- Al finalizar la clase: resumen high-yield + mapa mental + **se guarda en Supabase**.
- Vista de clase guardada: resumen, mapa mental, transcript descargable.

## 🛠 Stack

- **Next.js 14+ (App Router), JavaScript.**
- **Supabase (proyecto en la nube, supabase.com) — Auth + Postgres.** Paquete: `@supabase/ssr`
  (NO `@supabase/auth-helpers-nextjs`, deprecado). **Nada de Supabase local/CLI.**
- **Groq** (`groq-sdk`): `whisper-large-v3-turbo` (audio→texto), `openai/gpt-oss-20b`
  (conceptos/quiz), `openai/gpt-oss-120b` (refuerzo/chatbot/resumen final).
  **NUNCA `llama-3.3-70b-versatile` ni `llama-3.1-8b-instant` — deprecados.**
- **pdf-parse** → `pdf-parse/lib/pdf-parse.js` (NO `pdf-parse` directo, truena en Vercel).
- **markmap-lib + markmap-view** (mapa mental visual). **react-markdown** (render del resumen).
- **Deploy: Vercel.**

## 🗂 Arquitectura de archivos

```
/app
  page.js                       # P1 — redirige a /dashboard o /login según sesión
  /login/page.js                # P1 — Google + email/contraseña
  /auth/callback/route.js       # P1 — intercambio de code por sesión (OAuth)
  /dashboard/page.js            # P1 — lista de clases del usuario + botón "Nueva clase"
  /class/new/page.js            # P1 — EL LOOP DE CLASE EN VIVO (lo que ya tenían en page.js)
  /class/[id]/page.js           # P1 — clase guardada: resumen, mapa mental, descargar transcript
  layout.js, globals.css        # P1
  /api
    /transcribe/route.js        # P2 — SIN CAMBIOS
    /concepts/route.js          # P2 — SIN CAMBIOS
    /upload-material/route.js   # P2 — SIN CAMBIOS
    /quiz/route.js               # P3 — SIN CAMBIOS
    /reinforcement/route.js      # P3 — SIN CAMBIOS
    /chatbot/route.js            # P3 — SIN CAMBIOS
    /finish-class/route.js       # P3 — SIN CAMBIOS (sigue sin tocar Supabase)
/lib
  groq.js                       # líder (init)
  /supabase/client.js           # P1 — cliente para Client Components
  /supabase/server.js           # P1 — cliente para Server Components
/middleware.js                  # P1 — protege /dashboard y /class/*
/components
  Card.js, Button.js, MindMap.js  # P1
```

## 📐 Contrato de datos (SIN CAMBIOS — P2 y P3 no necesitan leer nada nuevo de esta sección)

```
POST /api/transcribe   body: FormData "audio" (blob webm)               resp: {"text":"..."}
POST /api/concepts     body: {"transcript":"..."}                        resp: {"concepts":[{"name":"...","summary":"..."}]}
POST /api/upload-material body: FormData "pdf"                            resp: {"summary":"..."}
POST /api/quiz         body: {"concepts":[...]}                           resp: {"concept":"...","question":"...","options":{"A":"...","B":"...","C":"..."},"correct":"A"}
POST /api/reinforcement body: {"concept_name":"...","concept_summary":"..."} resp: {"markdown":"..."}
POST /api/chatbot      body: {"question":"...","material_summary":"...","transcript":"..."} resp: {"answer":"..."}
POST /api/finish-class body: {"transcript":"...","concepts":[...]}        resp: {"title":"...","final_summary":"...","final_mindmap":"..."}
```

---

## 👤 INIT — solo el líder (P1), antes de que nadie clone

### 1. Next.js + dependencias
```bash
npx create-next-app@latest vibelearning --js --app --no-src-dir --tailwind --eslint
cd vibelearning
npm install groq-sdk pdf-parse markmap-lib markmap-view react-markdown @supabase/supabase-js @supabase/ssr
```

### 2. Supabase — proyecto EN LA NUBE (supabase.com, no local)
1. supabase.com → **New Project** (esperar ~2 min a que provisione).
2. Settings → API → copiar **Project URL** y **anon/publishable key**.
3. SQL Editor → ejecutar:
```sql
create table classes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null default auth.uid(),
  title text not null default 'Clase sin título',
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table classes enable row level security;
create policy "select_own" on classes for select using (auth.uid() = user_id);
create policy "insert_own" on classes for insert with check (auth.uid() = user_id);
create policy "update_own" on classes for update using (auth.uid() = user_id);
create policy "delete_own" on classes for delete using (auth.uid() = user_id);
```
4. Authentication → Providers → **Email**: ya está activo. **Authentication → Settings → 
   desactivar "Confirm email"** — sin esto, cada signup espera un correo de confirmación, lo
   cual mata la demo en vivo.
5. Authentication → Providers → **Google**: activar, pegar Client ID + Secret de Google Cloud
   Console (Authorized redirect URI = la callback URL que muestra Supabase en este mismo panel).
   **Timebox de 20 minutos.** Si no jala, no es bloqueante — ya tienen email/contraseña
   funcionando como login principal, Google queda como bonus si hay tiempo después.

### 3. Variables de entorno
`.env.local`:
```
GROQ_API_KEY=gsk_...
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```
Compartir estos 3 valores por chat privado (WhatsApp/Slack), **nunca por git**. Agregar los
mismos 3 en Vercel → Settings → Environment Variables.

### 4. Stubs + estructura + push
Crear stubs vacíos de los 7 endpoints (igual que antes) y de las páginas nuevas (`/login`,
`/dashboard`, `/class/new`, `/class/[id]`, `/auth/callback`) con contenido mínimo placeholder.
```bash
git init && git add . && git commit -m "chore: scaffold VibeLearning + Supabase + stubs + deps"
git remote add origin <repo> && git push -u origin main
```
Conectar a Vercel (con las env vars ya puestas) → deploy. Avisar: "clonen ya".

---

## 👥 Reparto de propiedad

| Rol | Archivos exclusivos | Responsabilidad |
|---|---|---|
| **P1** (líder) | Todo `/app` excepto `/api`, todo `/components`, `/lib/supabase/*`, `/middleware.js` | Frontend completo: auth, dashboard, loop de clase en vivo, persistencia en Supabase |
| **P2** | `app/api/transcribe`, `app/api/concepts`, `app/api/upload-material` | Ingestión — **sin cambios, sin Supabase** |
| **P3** | `app/api/quiz`, `app/api/reinforcement`, `app/api/chatbot`, `app/api/finish-class` | Evaluación/asistencia — **sin cambios, sin Supabase** |

---

## 📋 Secuencia de commits por rol

### 🟣 P1 — con prioridad interna (los primeros 6 son innegociables, el resto se corta si falta tiempo)

**Innegociables (P0 de P1):**
```
feat: lib/supabase/client.js + server.js + middleware.js
feat: /login con email y contraseña (signUp + signInWithPassword)
feat: /auth/callback (exchangeCodeForSession)
feat: mover el loop de clase en vivo a /class/new (mic, transcript, conceptos, quiz, refuerzo)
feat: conectar chatbot y upload de PDF en /class/new
feat: guardar en Supabase al finalizar clase (insert en tabla classes) + redirigir a /dashboard
```

**Si queda tiempo (P1 de P1):**
```
feat: botón "Continuar con Google" en /login
feat: /dashboard — lista de clases del usuario (Server Component, query a Supabase)
feat: /class/[id] — ver clase guardada (resumen react-markdown + MindMap + descargar transcript)
feat: design tokens consistentes + Card/Button compartidos en todas las páginas
```

### 🔵 P2 — SIN CAMBIOS respecto al archivo anterior
```
feat: /api/transcribe con Groq Whisper (whisper-large-v3-turbo)
feat: /api/concepts con Groq gpt-oss-20b + parsing robusto de JSON
feat: /api/upload-material (pdf-parse/lib/pdf-parse.js + resumen compacto gpt-oss-120b)
fix: manejo de 429 -> {skip:true} sin crashear, en los 3 endpoints
```

### 🟢 P3 — SIN CAMBIOS respecto al archivo anterior
```
feat: /api/quiz (gpt-oss-20b, pregunta corta y simple) + parsing robusto de JSON
feat: /api/reinforcement (gpt-oss-120b, devuelve {markdown})
feat: /api/chatbot (gpt-oss-120b, max_tokens 110, sin markdown, devuelve {answer})
feat: /api/finish-class (gpt-oss-120b, devuelve title + final_summary + final_mindmap)
fix: strip de markdown en /api/chatbot + 1 reintento de parse en endpoints que piden JSON
```

### 🟡 Los tres juntos (últimos 10 min)
```
fix: integración end-to-end + login real + guardado en Supabase + verificar en Vercel en vivo
```

---

## 🔐 `/login/page.js` (P1) — Google + email/contraseña

```jsx
"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("signin");
  const [error, setError] = useState("");

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
  }

  async function handleEmail(e) {
    e.preventDefault();
    setError("");
    const { error } = mode === "signin"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    if (error) setError(error.message);
    else window.location.href = "/dashboard";
  }

  return (
    <div>
      <button onClick={handleGoogle}>Continuar con Google</button>
      <form onSubmit={handleEmail}>
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="correo" />
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="contraseña" />
        <button type="submit">{mode === "signin" ? "Entrar" : "Crear cuenta"}</button>
      </form>
      <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
        {mode === "signin" ? "¿No tienes cuenta? Crear una" : "¿Ya tienes cuenta? Entrar"}
      </button>
      {error && <p>{error}</p>}
    </div>
  );
}
```

## `/lib/supabase/client.js` y `server.js` (P1)

```js
// lib/supabase/client.js
import { createBrowserClient } from "@supabase/ssr";
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
```
```js
// lib/supabase/server.js
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          try { toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); }
          catch {}
        },
      },
    }
  );
}
```

## `/auth/callback/route.js` (P1)

```js
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(`${origin}/dashboard`);
}
```

## `/middleware.js` (P1)

```js
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  const protectedPaths = ["/dashboard", "/class"];
  if (!user && protectedPaths.some((p) => request.nextUrl.pathname.startsWith(p))) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return response;
}
export const config = { matcher: ["/dashboard/:path*", "/class/:path*"] };
```

## Guardar la clase al finalizar (dentro de `/class/new/page.js`, P1)

```js
import { createClient } from "@/lib/supabase/client";
// ...después de recibir la respuesta de /api/finish-class:
const supabase = createClient();
const { data: { user } } = await supabase.auth.getUser();
await supabase.from("classes").insert({
  user_id: user.id,
  title: result.title,
  data: {
    transcript, concepts, quiz_results,
    material_summary, final_summary: result.final_summary,
    final_mindmap: result.final_mindmap,
  },
});
window.location.href = "/dashboard";
```
No hace falta endpoint nuevo para esto — el cliente de Supabase ya respeta la RLS usando la
sesión del usuario logueado.

## `/dashboard/page.js` (Server Component, P1)

```jsx
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function Dashboard() {
  const supabase = await createClient();
  const { data: classes } = await supabase
    .from("classes").select("*").order("created_at", { ascending: false });

  return (
    <div>
      <Link href="/class/new">+ Nueva clase</Link>
      {classes?.map((c) => (
        <Link key={c.id} href={`/class/${c.id}`}>{c.title}</Link>
      ))}
    </div>
  );
}
```

---

## 🔁 Lógica del loop de clase (sin cambios, ahora vive en `/class/new/page.js`)

- `getUserMedia` → `MediaRecorder` chunks de 7s → `/api/transcribe` → concatena transcript.
- Ventana acumulada ~90-120s → `/api/concepts` → conceptos → `/api/quiz`.
- Quiz banner no bloqueante. Incorrecto → `/api/reinforcement` → `<MindMap>`.
- Chatbot flotante → `/api/chatbot`.
- "Finalizar clase" → `/api/finish-class` → guardar en Supabase (ver arriba) → `/dashboard`.

## ✍️ Prompts — SIN CAMBIOS (P2 y P3 ya los tienen, aquí solo de referencia)

Conceptos, quiz, refuerzo, chatbot y finish-class: idénticos al archivo anterior. No los
repito aquí para no confundir — P2 y P3 siguen su propia copia ya en curso.

## 🛡️ Recordatorios técnicos vigentes

- `pdf-parse/lib/pdf-parse.js`, nunca `pdf-parse` directo.
- Modelos válidos: `openai/gpt-oss-20b`, `openai/gpt-oss-120b`. Nunca los llama deprecados.
- Rate limits: chunks ≥6-7s, LLM por ventana acumulada, transcript truncado a ~3000 palabras
  en el chatbot, todo 429 → `{skip:true}`.
- **"Confirm email" desactivado en Supabase** — si no, el signup no entra directo y la demo
  se traba esperando un correo.

## ✅ MVP listo

- [ ] Login funciona con email/contraseña como mínimo (Google es bonus).
- [ ] `/class/new` corre el loop completo igual que antes de agregar Supabase.
- [ ] Al finalizar, la clase aparece guardada y visible en `/dashboard`.
- [ ] RLS confirmada: un usuario no ve clases de otro usuario (probar con 2 cuentas distintas).
