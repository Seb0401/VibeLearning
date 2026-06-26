-- VibeLearning — esquema inicial
-- Ejecutar en Supabase: Dashboard → SQL Editor → pegar y correr.
-- Mapea el contrato de datos del MVP (clases, conceptos, intentos de quiz).

create extension if not exists "pgcrypto";

-- Una clase = una sesión en vivo.
create table if not exists public.classes (
  id               uuid primary key default gen_random_uuid(),
  title            text,
  transcript       text        not null default '',
  material_summary text,                 -- resumen del PDF subido (RAG)
  final_summary    text,                 -- resumen high-yield (finish-class)
  final_mindmap    text,                 -- mapa mental markdown (finish-class)
  created_at       timestamptz not null default now(),
  finished_at      timestamptz
);

-- Conceptos extraídos por /api/concepts.
create table if not exists public.concepts (
  id         uuid primary key default gen_random_uuid(),
  class_id   uuid not null references public.classes(id) on delete cascade,
  name       text not null,
  summary    text,
  created_at timestamptz not null default now()
);

-- Intentos de quiz (active recall).
create table if not exists public.quiz_attempts (
  id          uuid primary key default gen_random_uuid(),
  class_id    uuid not null references public.classes(id) on delete cascade,
  concept     text,
  question    text,
  correct     text,         -- opción correcta (A/B/C)
  chosen      text,         -- opción elegida por el alumno
  is_correct  boolean,
  created_at  timestamptz not null default now()
);

create index if not exists concepts_class_id_idx       on public.concepts(class_id);
create index if not exists quiz_attempts_class_id_idx  on public.quiz_attempts(class_id);

-- ───────────────────────────────────────────────────────────────────────────
-- RLS: el MVP no tiene login. Las escrituras van por el server con la
-- service_role key (ignora RLS). Aquí se deja RLS activado y SIN policies, de
-- modo que la anon key del cliente NO pueda leer ni escribir directamente.
-- Si más adelante quieres lecturas públicas desde el browser, añade policies.
-- ───────────────────────────────────────────────────────────────────────────
alter table public.classes       enable row level security;
alter table public.concepts      enable row level security;
alter table public.quiz_attempts enable row level security;
