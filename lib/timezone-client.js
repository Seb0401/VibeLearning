"use client";
import { createContext, useContext } from "react";

// Zona horaria compartida entre el servidor y el navegador. El layout raíz la lee de la cookie
// "tz" (que guarda el Sidebar) y la pasa aquí; así las fechas se formatean igual en el SSR
// (Vercel corre en UTC) y en el navegador, sin errores de hidratación.
const TimeZoneContext = createContext("America/Lima");

export function TimeZoneProvider({ tz, children }) {
  return <TimeZoneContext.Provider value={tz}>{children}</TimeZoneContext.Provider>;
}

export function useTimeZone() {
  return useContext(TimeZoneContext);
}

export function formatDate(date, opts, tz) {
  return new Date(date).toLocaleDateString("es-MX", { ...opts, timeZone: tz });
}

export function formatTime(date, opts, tz) {
  return new Date(date).toLocaleTimeString("es-MX", { ...opts, timeZone: tz });
}

// Clave "AAAA-MM-DD" del día en la zona horaria dada
export function dayKey(date, tz) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(date));
}
