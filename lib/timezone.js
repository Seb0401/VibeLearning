import { cookies } from "next/headers";

// Zona horaria por defecto si el navegador todavía no la mandó (el equipo y los usuarios están en Perú).
export const DEFAULT_TIME_ZONE = "America/Lima";

// Zona horaria del usuario para Server Components: la guarda el Sidebar en la cookie "tz".
export async function getUserTimeZone() {
  const store = await cookies();
  const tz = store.get("tz")?.value;
  if (tz) {
    try {
      new Intl.DateTimeFormat("es", { timeZone: tz });
      return tz;
    } catch {
      // cookie con un valor inválido: usamos el valor por defecto
    }
  }
  return DEFAULT_TIME_ZONE;
}
