"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const BUCKET = "class-images";
const TTL_SECONDS = 3600;
const REFRESH_BEFORE_MS = 5 * 60 * 1000; // renueva 5 min antes de que venza

// Imagen de Supabase Storage con URL firmada que se renueva sola:
// - antes de que venza (la página puede quedar abierta más de una hora)
// - si la carga falla (URL vencida o inválida), una vez
export default function StorageImage({ path, initialUrl, alt = "", style, fallback = null }) {
  const [url, setUrl]       = useState(initialUrl || null);
  const [failed, setFailed] = useState(false);
  const retried = useRef(false);

  const refresh = useCallback(async () => {
    if (!path) return null;
    const { data, error } = await createClient().storage.from(BUCKET).createSignedUrl(path, TTL_SECONDS);
    if (error || !data?.signedUrl) return null;
    return data.signedUrl;
  }, [path]);

  // Renovación programada mientras la página siga abierta.
  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    const id = setInterval(async () => {
      const next = await refresh();
      if (!cancelled && next) setUrl(next);
    }, TTL_SECONDS * 1000 - REFRESH_BEFORE_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, [path, refresh]);

  // Sin URL inicial (p. ej. falló en el servidor): pedir una al montar.
  useEffect(() => {
    if (url || !path) return;
    let cancelled = false;
    refresh().then((next) => {
      if (cancelled) return;
      if (next) setUrl(next); else setFailed(true);
    });
    return () => { cancelled = true; };
  }, [url, path, refresh]);

  async function handleError() {
    if (retried.current) { setFailed(true); return; }
    retried.current = true;
    const next = await refresh();
    if (next) setUrl(next); else setFailed(true);
  }

  if (failed || !url) return fallback;
  // eslint-disable-next-line @next/next/no-img-element -- URL firmada externa y dinámica
  return <img src={url} alt={alt} style={style} onError={handleError} />;
}
