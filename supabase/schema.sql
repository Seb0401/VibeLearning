-- VibeLearning — esquema de Supabase
-- Ejecutar en Supabase: Dashboard → SQL Editor → pegar y correr.
-- Todo lo de la clase (transcript, conceptos, quiz, resumen, mapa mental...)
-- vive en la columna jsonb `data`. El resto de secciones del dashboard usa localStorage.

create table if not exists public.classes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users not null default auth.uid(),
  title      text not null default 'Clase sin título',
  data       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists classes_user_created_idx on public.classes (user_id, created_at desc);

alter table public.classes enable row level security;

drop policy if exists "select_own" on public.classes;
drop policy if exists "insert_own" on public.classes;
drop policy if exists "update_own" on public.classes;
drop policy if exists "delete_own" on public.classes;

create policy "select_own" on public.classes for select using (auth.uid() = user_id);
create policy "insert_own" on public.classes for insert with check (auth.uid() = user_id);
create policy "update_own" on public.classes for update using (auth.uid() = user_id);
create policy "delete_own" on public.classes for delete using (auth.uid() = user_id);

-- ── Storage: fotos de la pizarra (visual notes) ────────────────────────────
-- Ruta de cada archivo: <user_id>/<class_id>/<timestamp>.jpg
insert into storage.buckets (id, name, public)
values ('class-images', 'class-images', false)
on conflict (id) do nothing;

drop policy if exists "class_images_select_own" on storage.objects;
drop policy if exists "class_images_insert_own" on storage.objects;
drop policy if exists "class_images_delete_own" on storage.objects;

create policy "class_images_select_own" on storage.objects for select
  using (bucket_id = 'class-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "class_images_insert_own" on storage.objects for insert
  with check (bucket_id = 'class-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "class_images_delete_own" on storage.objects for delete
  using (bucket_id = 'class-images' and (storage.foldername(name))[1] = auth.uid()::text);
