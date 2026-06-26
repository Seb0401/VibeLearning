"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/* ── Lucide-style icons ───────────────────────────────────────────────── */
function Svg({ size = 18, children }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

const IcoHome    = () => <Svg><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/></Svg>;
const IcoHistory = () => <Svg><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></Svg>;
const IcoLibrary = () => <Svg><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></Svg>;
const IcoStats   = () => <Svg><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></Svg>;
const IcoNotes   = () => <Svg><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></Svg>;
const IcoRepaso  = () => <Svg><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></Svg>;
const IcoExam    = () => <Svg><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><polyline points="16 13 12 17 8 13"/><line x1="12" y1="17" x2="12" y2="10"/></Svg>;
const IcoMapNet  = () => <Svg><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></Svg>;
const IcoTarget  = () => <Svg><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></Svg>;
const IcoSettings = () => <Svg><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></Svg>;
const IcoLogOut  = () => <Svg size={15}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></Svg>;

/* ── Nav config ───────────────────────────────────────────────────────── */
const NAV_GROUPS = [
  {
    label: "Principal",
    items: [
      { href: "/dashboard",              label: "Inicio",       Icon: IcoHome,   exact: true },
      { href: "/dashboard/estadisticas", label: "Estadísticas", Icon: IcoStats               },
      { href: "/dashboard/metas",        label: "Metas",        Icon: IcoTarget              },
    ],
  },
  {
    label: "Estudiar",
    items: [
      { href: "/dashboard/repaso",       label: "Repaso",       Icon: IcoRepaso  },
      { href: "/dashboard/evaluaciones", label: "Evaluaciones", Icon: IcoExam    },
      { href: "/dashboard/mapa-global",  label: "Mapa global",  Icon: IcoMapNet  },
    ],
  },
  {
    label: "Contenido",
    items: [
      { href: "/dashboard/historial",    label: "Historial",    Icon: IcoHistory },
      { href: "/dashboard/biblioteca",   label: "Biblioteca",   Icon: IcoLibrary },
      { href: "/dashboard/notas",        label: "Notas",        Icon: IcoNotes   },
    ],
  },
];

/* ── Component ────────────────────────────────────────────────────────── */
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

  const S = {
    root: {
      width: 240,
      flexShrink: 0,
      background: "var(--sidebar)",
      borderRight: "1px solid var(--border)",
      display: "flex",
      flexDirection: "column",
      height: "100vh",
      position: "sticky",
      top: 0,
      padding: "0",
    },
    logoArea: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "24px 20px 20px",
    },
    logoIcon: {
      width: 32,
      height: 32,
      borderRadius: 9,
      background: "linear-gradient(135deg, #7C6CF8 0%, #A78BFA 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      boxShadow: "0 4px 12px rgba(124,108,248,0.3)",
    },
    logoText: {
      fontWeight: 700,
      fontSize: 15,
      color: "var(--text)",
      letterSpacing: "-0.01em",
    },
    navSection: {
      padding: "4px 12px",
      display: "flex",
      flexDirection: "column",
      gap: 2,
    },
    navLabel: {
      fontSize: 10,
      fontWeight: 600,
      color: "var(--text-3)",
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      padding: "8px 8px 4px",
    },
    divider: {
      height: 1,
      background: "var(--border)",
      margin: "8px 20px",
    },
    footer: {
      padding: "12px",
    },
    userRow: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "10px 8px",
      borderRadius: 10,
      cursor: "pointer",
      transition: "background 150ms ease",
    },
    avatar: {
      width: 34,
      height: 34,
      borderRadius: "50%",
      background: "linear-gradient(135deg, var(--accent), #A78BFA)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "white",
      fontWeight: 700,
      fontSize: 14,
      flexShrink: 0,
    },
  };

  return (
    <aside style={S.root}>
      {/* Logo */}
      <div style={S.logoArea}>
        <div style={S.logoIcon}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="white">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
          </svg>
        </div>
        <span style={S.logoText}>VibeLearning</span>
      </div>

      {/* Navigation */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {NAV_GROUPS.map(({ label, items }) => (
          <div key={label} style={S.navSection}>
            <p style={S.navLabel}>{label}</p>
            {items.map(({ href, label: itemLabel, Icon, exact }) => {
              const active = exact ? pathname === href : pathname.startsWith(href);
              return (
                <Link key={href} href={href} style={{ textDecoration: "none" }}>
                  <div
                    className={active ? undefined : "nav-item"}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "9px 10px",
                      borderRadius: 10,
                      color: active ? "var(--accent)" : "var(--text-2)",
                      background: active ? "var(--accent-dim)" : "transparent",
                      fontWeight: active ? 600 : 400,
                      fontSize: 14,
                      border: active ? "1px solid rgba(124,108,248,0.18)" : "1px solid transparent",
                      transition: "background 150ms, color 150ms, border-color 150ms",
                    }}
                  >
                    <Icon />
                    {itemLabel}
                  </div>
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* Bottom */}
      <div>
        <div style={S.divider} />
        <div style={S.footer}>
          {/* Settings */}
          <div
            className="nav-item"
            style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "9px 10px", borderRadius: 10,
              color: "var(--text-2)", fontSize: 14,
              cursor: "pointer", marginBottom: 4,
            }}
          >
            <IcoSettings />
            Ajustes
          </div>

          {/* User */}
          <div style={S.divider} />
          <div
            className="nav-item"
            style={S.userRow}
            onClick={handleSignOut}
            title="Cerrar sesión"
          >
            <div style={S.avatar}>{initial}</div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {userName}
              </p>
              <p style={{ fontSize: 11, color: "var(--accent)", marginTop: 1 }}>Plan Pro</p>
            </div>
            <IcoLogOut />
          </div>
        </div>
      </div>
    </aside>
  );
}
