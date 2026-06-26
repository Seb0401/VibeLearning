"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function HomeIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <path d="M9 22V12h6v10" />
    </svg>
  );
}
function ClockIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
function GridIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}
function TargetIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
    </svg>
  );
}
function GearIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

const NAV = [
  { href: "/dashboard", label: "Inicio", Icon: HomeIcon, exact: true },
  { href: "/dashboard/historial", label: "Historial", Icon: ClockIcon },
  { href: "/dashboard/biblioteca", label: "Biblioteca", Icon: GridIcon },
  { href: "/dashboard/estadisticas", label: "Estadísticas", Icon: TargetIcon },
];

export default function Sidebar({ userName }) {
  const pathname = usePathname();
  const router = useRouter();
  const initial = (userName || "A")[0].toUpperCase();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside style={{
      width: 176,
      flexShrink: 0,
      background: "#11111e",
      borderRight: "1px solid var(--border)",
      display: "flex",
      flexDirection: "column",
      height: "100vh",
      position: "sticky",
      top: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: "1.25rem 1rem", display: "flex", alignItems: "center", gap: 9 }}>
        <div style={{
          width: 30, height: 30,
          background: "linear-gradient(135deg,#7c6df2,#a78bfa)",
          borderRadius: 8,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "white", fontWeight: 800, fontSize: "0.85rem", flexShrink: 0,
        }}>V</div>
        <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--text)" }}>VibeLearning</span>
      </div>

      {/* Nav */}
      <nav style={{ padding: "0 0.6rem", display: "flex", flexDirection: "column", gap: 2 }}>
        {NAV.map(({ href, label, Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link key={href} href={href} style={{ textDecoration: "none" }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 9,
                padding: "0.55rem 0.75rem", borderRadius: 8,
                background: active ? "rgba(124,109,242,0.15)" : "transparent",
                color: active ? "var(--accent)" : "var(--text-muted)",
                transition: "background 0.15s",
              }}>
                <Icon />
                <span style={{ fontSize: "0.85rem", fontWeight: active ? 600 : 400 }}>{label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      <div style={{ flex: 1 }} />

      {/* Settings */}
      <div style={{ padding: "0 0.6rem 0.5rem" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 9,
          padding: "0.55rem 0.75rem", borderRadius: 8,
          color: "var(--text-muted)", cursor: "pointer",
        }}>
          <GearIcon />
          <span style={{ fontSize: "0.85rem" }}>Ajustes</span>
        </div>
      </div>

      {/* User */}
      <div
        onClick={handleSignOut}
        title="Cerrar sesión"
        style={{
          padding: "0.75rem 1rem",
          borderTop: "1px solid var(--border)",
          display: "flex", alignItems: "center", gap: 9,
          cursor: "pointer",
        }}
      >
        <div style={{
          width: 32, height: 32, borderRadius: "50%",
          background: "var(--accent)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "white", fontWeight: 700, fontSize: "0.8rem", flexShrink: 0,
        }}>{initial}</div>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: "0.82rem", fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {userName}
          </p>
          <p style={{ margin: 0, fontSize: "0.7rem", color: "var(--accent)" }}>Plan Pro</p>
        </div>
      </div>
    </aside>
  );
}
