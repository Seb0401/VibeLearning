"use client";
import { useMemo, useSyncExternalStore } from "react";

// Estado persistido en localStorage, leído con useSyncExternalStore:
// - en el servidor (y en la hidratación) devuelve `fallback`, sin errores de hidratación
// - se actualiza en todos los componentes que usan la misma clave (y entre pestañas)
// `fallback` debe ser una referencia estable (constante fuera del componente).

const listeners = new Set();

function subscribe(callback) {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

export function readStoredJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function writeStoredJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // almacenamiento lleno o bloqueado: seguimos sin persistir
  }
  listeners.forEach((l) => l());
}

export function useStoredJSON(key, fallback) {
  const raw = useSyncExternalStore(
    subscribe,
    () => {
      try { return localStorage.getItem(key); } catch { return null; }
    },
    () => null,
  );
  return useMemo(() => {
    if (raw == null) return fallback;
    try { return JSON.parse(raw); } catch { return fallback; }
  }, [raw, fallback]);
}

// Suscripción sin cambios: para leer valores del navegador que no emiten eventos.
function subscribeNoop() {
  return () => {};
}

// Devuelve el valor calculado en el navegador, o `serverValue` durante SSR/hidratación.
export function useBrowserValue(getValue, serverValue) {
  return useSyncExternalStore(subscribeNoop, getValue, () => serverValue);
}
