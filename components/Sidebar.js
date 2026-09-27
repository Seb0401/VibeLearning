"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { NAV_ITEMS, NAV_GROUP_ORDER, isItemActive, resolveVisible } from "./navConfig";
import BrandLogo from "./Logo";
import ThemeToggle from "./ThemeToggle";
import Avatar from "./Avatar";

function Svg({ size = 18, children }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

const ICONS = {
  home:     <Svg><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/></Svg>,
  stats:    <Svg><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></Svg>,
  timeline: <Svg><path d="M3 12a9 9 0 1 0 2.64-6.36L3 8"/><path d="M3 3v5h5"/><polyline points="12 7 12 12 15.5 14"/></Svg>,
  repaso:   <Svg><rect x="2" y="7" width="14" height="15" rx="2"/><path d="M6 3h12a2 2 0 0 1 2 2v13"/><path d="m6.5 14.5 2 2 4-4"/></Svg>,
  exam:     <Svg><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><polyline points="16 13 12 17 8 13"/><line x1="12" y1="17" x2="12" y2="10"/></Svg>,
  cheat:    <Svg><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="9" y1="7" x2="15" y2="7"/><line x1="9" y1="11" x2="15" y2="11"/><line x1="9" y1="15" x2="12" y2="15"/></Svg>,
  map:      <Svg><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></Svg>,
  timer:    <Svg><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></Svg>,
  courses:  <Svg><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></Svg>,
  library:  <Svg><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></Svg>,
  notes:    <Svg><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></Svg>,
  export:   <Svg><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></Svg>,
};
const IcoLogOut = () => <Svg size={15}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></Svg>;
const IcoSliders = () => <Svg size={15}><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></Svg>;
const IcoLock = () => <Svg size={13}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></Svg>;
const IcoMenu  = () => <Svg size={20}><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></Svg>;
const IcoClose = () => <Svg size={20}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></Svg>;

function Logo({ size = 30 }) {
  return <BrandLogo size={size} textSize={17} />;
}

/* ── Modal: elegir qué páginas aparecen en el sidebar ──────────────────── */
export function CustomizeModal({ visible, onClose, onSaved }) {
  const [draft, setDraft]   = useState(() => new Set(visible));
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  // Cerrar con Escape
  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function toggle(key) {
    setDraft(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  async function save() {
    setSaving(true);
    setError("");
    const keys = resolveVisible([...draft]);
    try {
      const supabase = createClient();
      const { error: err } = await supabase.auth.updateUser({ data: { sidebar_pages: keys } });
      if (err) throw err;
      onSaved(keys);
    } catch (err) {
      console.error("[sidebar] no se pudo guardar:", err);
      setError("No se pudo guardar. Inténtalo de nuevo.");
      setSaving(false);
    }
  }

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="customize-title" onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div className="fade-up" onClick={e => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 420, maxHeight: "85vh", display: "flex", flexDirection: "column", background: "var(--card)", border: "1px solid var(--border-strong)", borderRadius: 18, boxShadow: "0 30px 80px rgba(0,0,0,0.5)" }}>
        <div style={{ padding: "20px 22px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h2 id="customize-title" style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>Personalizar menú</h2>
            <p style={{ fontSize: 12.5, color: "var(--text-2)", marginTop: 4, lineHeight: 1.5 }}>Elige qué páginas aparecen en el menú lateral. Las fijas no se pueden ocultar.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="link-muted" style={{ background: "none", border: "none", color: "var(--text-3)", cursor: "pointer", display: "flex" }}>
            <IcoClose />
          </button>
        </div>

        <div style={{ overflowY: "auto", padding: "8px 14px" }}>
          {NAV_GROUP_ORDER.map(group => (
            <div key={group} style={{ marginBottom: 6 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", letterSpacing: "0.08em", textTransform: "uppercase", padding: "10px 8px 4px" }}>{group}</p>
              {NAV_ITEMS.filter(i => i.group === group).map(item => {
                const checked = item.fixed || draft.has(item.key);
                return (
                  <label key={item.key} className={item.fixed ? undefined : "row-hover"}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 8px", cursor: item.fixed ? "default" : "pointer", color: checked ? "var(--text)" : "var(--text-3)" }}>
                    <input type="checkbox" checked={checked} disabled={item.fixed} onChange={() => toggle(item.key)}
                      style={{ width: 16, height: 16, accentColor: "var(--accent)", cursor: item.fixed ? "default" : "pointer" }} />
                    <span style={{ display: "flex", color: checked ? "var(--accent)" : "var(--text-3)" }}>{ICONS[item.icon]}</span>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{item.label}</span>
                    {item.fixed && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10.5, color: "var(--text-3)" }}><IcoLock /> Fija</span>
                    )}
                  </label>
                );
              })}
            </div>
          ))}
        </div>

        {error && <p role="alert" style={{ color: "var(--red)", fontSize: 12.5, padding: "0 22px 8px" }}>{error}</p>}

        <div style={{ padding: "14px 22px 18px", borderTop: "1px solid var(--border)", display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose} className="btn-ghost" style={{ background: "transparent", color: "var(--text-2)", border: "1px solid var(--border)", borderRadius: 10, padding: "8px 16px", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
            Cancelar
          </button>
          <button type="button" onClick={save} disabled={saving} className="btn-accent" style={{ background: "var(--accent)", color: "white", border: "none", borderRadius: 10, padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", display: "inline-flex", alignItems: "center", gap: 7, opacity: saving ? 0.7 : 1 }}>
            {saving && <span className="spinner" style={{ width: 13, height: 13 }} />}
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Sidebar({ userName, userEmail, sidebarPages }) {
  const pathname = usePathname();
  const router   = useRouter();
  const [open, setOpen]           = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [visible, setVisible]     = useState(() => resolveVisible(sidebarPages));

  // Guarda la zona horaria del navegador para que las páginas del servidor muestren tu hora local.
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz && !document.cookie.includes(`tz=${encodeURIComponent(tz)}`)) {
        document.cookie = `tz=${encodeURIComponent(tz)}; path=/; max-age=31536000; samesite=lax`;
      }
    } catch {}
  }, []);

  const visibleSet = new Set(visible);
  // Si el usuario está en una página oculta, igual la mostramos para que no pierda la ubicación.
  const shown = NAV_ITEMS.filter(i => visibleSet.has(i.key) || isItemActive(i, pathname));

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      {/* Top bar solo en móvil */}
      <div className="mobile-topbar">
        <Link href="/dashboard" style={{ textDecoration: "none" }}><Logo size={28} /></Link>
        <ThemeToggle compact />
      </div>
      <div className={`sidebar-backdrop${open ? " is-open" : ""}`} onClick={() => setOpen(false)} />

      <aside className={`sidebar${open ? " is-open" : ""}`} style={{ width: 230, flexShrink: 0, background: "var(--sidebar)", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", height: "100vh", position: "sticky", top: 0 }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 18px 18px" }}>
          <Link href="/dashboard" onClick={() => setOpen(false)} style={{ textDecoration: "none" }}><Logo /></Link>
          {open && (
            <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar menú" style={{ background: "none", border: "none", color: "var(--text-2)", cursor: "pointer", display: "flex" }}>
              <IcoClose />
            </button>
          )}
        </div>

        {/* CTA */}
        <div style={{ padding: "0 10px 10px" }}>
          <Link href="/class/new" onClick={() => setOpen(false)} style={{ textDecoration: "none" }}>
            <div className="btn-accent" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, background: "var(--accent)", color: "white", borderRadius: 10, padding: "9px 12px", fontSize: 13, fontWeight: 600 }}>
              <Svg size={14}><polygon points="5 3 19 12 5 21 5 3"/></Svg>
              Nueva clase
            </div>
          </Link>
        </div>

        {/* Nav */}
        <nav aria-label="Navegación principal" style={{ flex: 1, overflowY: "auto", padding: "0 10px" }}>
          {NAV_GROUP_ORDER.map(group => {
            const items = shown.filter(i => i.group === group);
            if (!items.length) return null;
            return (
              <div key={group} style={{ marginBottom: 4 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", letterSpacing: "0.08em", textTransform: "uppercase", padding: "10px 8px 4px" }}>{group}</p>
                {items.map(item => {
                  const active = isItemActive(item, pathname);
                  return (
                    <Link key={item.key} href={item.href} onClick={() => setOpen(false)} aria-current={active ? "page" : undefined} style={{ textDecoration: "none", display: "block", borderRadius: 9 }}>
                      <div
                        className={active ? undefined : "nav-item"}
                        style={{
                          display: "flex", alignItems: "center", gap: 9,
                          padding: "8px 10px", borderRadius: 9, marginBottom: 1,
                          color: active ? "var(--accent)" : "var(--text-2)",
                          background: active ? "var(--accent-dim)" : "transparent",
                          fontWeight: active ? 600 : 400, fontSize: 13,
                          border: active ? "1px solid rgba(124,108,248,0.18)" : "1px solid transparent",
                        }}
                      >
                        {ICONS[item.icon]}
                        {item.label}
                      </div>
                    </Link>
                  );
                })}
              </div>
            );
          })}

          <button
            type="button"
            onClick={() => setCustomizing(true)}
            className="nav-item"
            style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", margin: "6px 0 10px", borderRadius: 9, background: "transparent", border: "1px dashed var(--border-strong)", color: "var(--text-3)", fontSize: 12.5, cursor: "pointer", textAlign: "left" }}
          >
            <IcoSliders />
            Personalizar menú
          </button>
        </nav>

        {/* Footer: tema + usuario + cerrar sesión */}
        <div style={{ padding: "8px 10px 12px" }}>
          <div style={{ padding: "0 2px 10px" }}><ThemeToggle /></div>
          <div style={{ height: 1, background: "var(--border)", marginBottom: 8 }} />
          <Link href="/dashboard/perfil" onClick={() => setOpen(false)} title="Ver perfil" className="nav-item" aria-current={pathname === "/dashboard/perfil" ? "page" : undefined}
            style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", borderRadius: 9, textDecoration: "none", background: pathname === "/dashboard/perfil" ? "var(--accent-dim)" : "transparent" }}>
            <Avatar size={32} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userName}</p>
              {userEmail && (
                <p title={userEmail} style={{ fontSize: 10.5, color: "var(--text-3)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userEmail}</p>
              )}
            </div>
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            className="nav-item"
            style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", borderRadius: 9, background: "transparent", border: "none", color: "var(--text-2)", fontSize: 13, cursor: "pointer", textAlign: "left" }}
          >
            <IcoLogOut />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {customizing && (
        <CustomizeModal
          visible={visible}
          onClose={() => setCustomizing(false)}
          onSaved={(keys) => { setVisible(keys); setCustomizing(false); }}
        />
      )}
    </>
  );
}
