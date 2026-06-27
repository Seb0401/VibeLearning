"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function Svg({ size = 18, children }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

const IcoHome     = () => <Svg><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/></Svg>;
const IcoStats    = () => <Svg><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></Svg>;
const IcoCronolog = () => <Svg><line x1="12" y1="2" x2="12" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></Svg>;
const IcoTarget   = () => <Svg><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></Svg>;
const IcoTrophy   = () => <Svg><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></Svg>;
const IcoRepaso   = () => <Svg><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></Svg>;
const IcoExam     = () => <Svg><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><polyline points="16 13 12 17 8 13"/><line x1="12" y1="17" x2="12" y2="10"/></Svg>;
const IcoMapNet   = () => <Svg><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></Svg>;
const IcoTimer    = () => <Svg><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></Svg>;
const IcoCalendar = () => <Svg><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></Svg>;
const IcoScanDoc  = () => <Svg><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></Svg>;
const IcoLibrary  = () => <Svg><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></Svg>;
const IcoNotes    = () => <Svg><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></Svg>;
const IcoCourses  = () => <Svg><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></Svg>;
const IcoCheatSh  = () => <Svg><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="9" y1="7" x2="15" y2="7"/><line x1="9" y1="11" x2="15" y2="11"/><line x1="9" y1="15" x2="12" y2="15"/></Svg>;
const IcoExport   = () => <Svg><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></Svg>;
const IcoSettings = () => <Svg><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></Svg>;
const IcoLogOut   = () => <Svg size={15}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></Svg>;

const NAV_GROUPS = [
  {
    label: "Principal",
    items: [
      { href: "/dashboard",              label: "Inicio",       Icon: IcoHome,     exact: true },
      { href: "/dashboard/estadisticas", label: "Estadísticas", Icon: IcoStats               },
      { href: "/dashboard/cronologia",   label: "Cronología",   Icon: IcoCronolog            },
      { href: "/dashboard/logros",       label: "Logros",       Icon: IcoTrophy              },
      { href: "/dashboard/metas",        label: "Metas",        Icon: IcoTarget              },
    ],
  },
  {
    label: "Aprender",
    items: [
      { href: "/dashboard/repaso",       label: "Repaso",       Icon: IcoRepaso   },
      { href: "/dashboard/evaluaciones", label: "Evaluaciones", Icon: IcoExam     },
      { href: "/dashboard/examenes",     label: "Mis exámenes", Icon: IcoScanDoc  },
      { href: "/dashboard/agenda",       label: "Agenda",       Icon: IcoCalendar },
      { href: "/dashboard/mapa-global",  label: "Mapa global",  Icon: IcoMapNet   },
      { href: "/dashboard/pomodoro",     label: "Pomodoro",     Icon: IcoTimer    },
    ],
  },
  {
    label: "Contenido",
    items: [
      { href: "/dashboard/biblioteca",   label: "Biblioteca",   Icon: IcoLibrary  },
      { href: "/dashboard/notas",        label: "Notas",        Icon: IcoNotes    },
      { href: "/dashboard/cursos",       label: "Cursos",       Icon: IcoCourses  },
      { href: "/dashboard/cheat-sheet",  label: "Cheat Sheet",  Icon: IcoCheatSh  },
      { href: "/dashboard/exportar",     label: "Exportar",     Icon: IcoExport   },
    ],
  },
];

export default function Sidebar({ userName }) {
  const pathname = usePathname();
  const router   = useRouter();
  const initial  = (userName || "A")[0].toUpperCase();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside style={{ width: 230, flexShrink: 0, background: "var(--sidebar)", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", height: "100vh", position: "sticky", top: 0 }}>
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "22px 18px 18px" }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg, #7C6CF8 0%, #A78BFA 100%)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 4px 12px rgba(124,108,248,0.3)" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="white"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
        </div>
        <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text)", letterSpacing: "-0.01em" }}>VibeLearning</span>
      </div>

      {/* Nav */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 10px" }}>
        {NAV_GROUPS.map(({ label, items }) => (
          <div key={label} style={{ marginBottom: 4 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", letterSpacing: "0.08em", textTransform: "uppercase", padding: "8px 8px 4px" }}>{label}</p>
            {items.map(({ href, label: lbl, Icon, exact }) => {
              const active = exact ? pathname === href : pathname.startsWith(href);
              return (
                <Link key={href} href={href} style={{ textDecoration: "none" }}>
                  <div
                    className={active ? undefined : "nav-item"}
                    style={{
                      display: "flex", alignItems: "center", gap: 9,
                      padding: "8px 10px", borderRadius: 9, marginBottom: 1,
                      color: active ? "var(--accent)" : "var(--text-2)",
                      background: active ? "var(--accent-dim)" : "transparent",
                      fontWeight: active ? 600 : 400, fontSize: 13,
                      border: active ? "1px solid rgba(124,108,248,0.18)" : "1px solid transparent",
                      transition: "background 150ms, color 150ms",
                    }}
                  >
                    <Icon />
                    {lbl}
                  </div>
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ padding: "8px 10px 12px" }}>
        <div style={{ height: 1, background: "var(--border)", marginBottom: 8 }} />
        <div className="nav-item" style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", borderRadius: 9, color: "var(--text-2)", fontSize: 13, cursor: "pointer", marginBottom: 4 }}>
          <IcoSettings />
          Ajustes
        </div>
        <div style={{ height: 1, background: "var(--border)", margin: "6px 0" }} />
        <div className="nav-item" onClick={handleSignOut} title="Cerrar sesión" style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 10px", borderRadius: 9, cursor: "pointer" }}>
          <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg, var(--accent), #A78BFA)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: 12, flexShrink: 0 }}>{initial}</div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userName}</p>
            <p style={{ fontSize: 10, color: "var(--accent)", marginTop: 1 }}>Plan Pro</p>
          </div>
          <IcoLogOut />
        </div>
      </div>
    </aside>
  );
}
