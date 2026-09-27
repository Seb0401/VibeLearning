// Configuración de navegación del dashboard.
// - Cada item del sidebar puede agrupar varias rutas (`match`) que se muestran como pestañas.
// - `fixed: true` → siempre visible, el usuario no puede ocultarlo.
// - La lista de items visibles se guarda en user_metadata.sidebar_pages (Supabase Auth).

export const NAV_ITEMS = [
  { key: "inicio",      group: "General",   href: "/dashboard",              label: "Inicio",      icon: "home",     fixed: true, exact: true },
  { key: "progreso",    group: "General",   href: "/dashboard/estadisticas", label: "Progreso",    icon: "stats",    match: ["/dashboard/estadisticas", "/dashboard/logros", "/dashboard/metas"] },
  { key: "historial",   group: "General",   href: "/dashboard/historial",    label: "Historial",   icon: "timeline", match: ["/dashboard/historial", "/dashboard/cronologia"] },

  { key: "repaso",      group: "Estudiar",  href: "/dashboard/repaso",       label: "Repaso",      icon: "repaso",   fixed: true, match: ["/dashboard/repaso", "/dashboard/agenda"] },
  { key: "examenes",    group: "Estudiar",  href: "/dashboard/evaluaciones", label: "Exámenes",    icon: "exam",     match: ["/dashboard/evaluaciones", "/dashboard/examenes"] },
  { key: "cheat-sheet", group: "Estudiar",  href: "/dashboard/cheat-sheet",  label: "Cheat Sheet", icon: "cheat" },
  { key: "mapa-global", group: "Estudiar",  href: "/dashboard/mapa-global",  label: "Mapa global", icon: "map" },
  { key: "pomodoro",    group: "Estudiar",  href: "/dashboard/pomodoro",     label: "Pomodoro",    icon: "timer" },

  { key: "cursos",      group: "Organizar", href: "/dashboard/cursos",       label: "Cursos",      icon: "courses",  fixed: true },
  { key: "biblioteca",  group: "Organizar", href: "/dashboard/biblioteca",   label: "Biblioteca",  icon: "library" },
  { key: "notas",       group: "Organizar", href: "/dashboard/notas",        label: "Notas",       icon: "notes" },
  { key: "exportar",    group: "Organizar", href: "/dashboard/exportar",     label: "Exportar",    icon: "export" },
];

export const NAV_GROUP_ORDER = ["General", "Estudiar", "Organizar"];

// Por defecto se muestran todas las páginas; el usuario oculta las que no use.
export const DEFAULT_VISIBLE = NAV_ITEMS.map((i) => i.key);

export function isItemActive(item, pathname) {
  if (item.exact) return pathname === item.href;
  const paths = item.match || [item.href];
  return paths.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

// Normaliza lo guardado en user_metadata: ignora claves desconocidas y fuerza las fijas.
export function resolveVisible(saved) {
  const valid = new Set(NAV_ITEMS.map((i) => i.key));
  const base = Array.isArray(saved) ? saved.filter((k) => valid.has(k)) : DEFAULT_VISIBLE;
  const set = new Set(base);
  NAV_ITEMS.filter((i) => i.fixed).forEach((i) => set.add(i.key));
  return NAV_ITEMS.filter((i) => set.has(i.key)).map((i) => i.key);
}

// Pestañas de las secciones unificadas.
export const SECTION_TABS = {
  historial: [
    { href: "/dashboard/historial",  label: "Lista" },
    { href: "/dashboard/cronologia", label: "Línea de tiempo" },
  ],
  repaso: [
    { href: "/dashboard/repaso", label: "Repaso de hoy" },
    { href: "/dashboard/agenda", label: "Calendario" },
  ],
  progreso: [
    { href: "/dashboard/estadisticas", label: "Estadísticas" },
    { href: "/dashboard/logros",       label: "Logros" },
    { href: "/dashboard/metas",        label: "Metas" },
  ],
  examenes: [
    { href: "/dashboard/evaluaciones", label: "Generar examen" },
    { href: "/dashboard/examenes",     label: "Analizar mis exámenes" },
  ],
};
