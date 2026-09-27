"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Icon from "./Icon";
import ThemeToggle from "./ThemeToggle";
import { NAV_ITEMS, NAV_GROUP_ORDER, isItemActive, resolveVisible } from "./navConfig";
import { createClient } from "@/lib/supabase/client";
import Avatar from "./Avatar";

// Barra inferior en móvil: las páginas fijas + "Nueva clase" + "Más" (hoja con el resto).
const TABS = [
  { key: "inicio", href: "/dashboard",        label: "Inicio", icon: "home"    },
  { key: "repaso", href: "/dashboard/repaso", label: "Repaso", icon: "repeat"  },
  { key: "nueva",  href: "/class/new",        label: "Nueva",  icon: "plus", primary: true },
  { key: "cursos", href: "/dashboard/cursos", label: "Cursos", icon: "folder"  },
];

const NAV_ICON = {
  home: "home", stats: "bar-chart", timeline: "clock", repaso: "repeat", exam: "clipboard",
  cheat: "file-text", map: "network", timer: "hourglass", courses: "folder", library: "book-open",
  notes: "pen-note", export: "download",
};

export default function MobileTabBar({ sidebarPages, userEmail }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const visible = new Set(resolveVisible(sidebarPages));

  // Cerrar la hoja con Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e) { if (e.key === "Escape") setOpen(false); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const tabActive = (t) => (t.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(t.href));
  const moreActive = !TABS.some((t) => !t.primary && tabActive(t)) && pathname.startsWith("/dashboard");

  return (
    <>
      <nav className="tabbar" aria-label="Navegación inferior">
        {TABS.map((t) =>
          t.primary ? (
            <Link key={t.key} href={t.href} className="tabbar__primary" aria-label="Nueva clase">
              <Icon name="plus" size={24} strokeWidth={2.4} />
            </Link>
          ) : (
            <Link key={t.key} href={t.href} className={`tabbar__item${tabActive(t) ? " is-active" : ""}`} aria-current={tabActive(t) ? "page" : undefined}>
              <Icon name={t.icon} size={21} />
              <span>{t.label}</span>
            </Link>
          )
        )}
        <button type="button" className={`tabbar__item${moreActive || open ? " is-active" : ""}`} onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open}>
          <Icon name="more" size={21} />
          <span>Más</span>
        </button>
      </nav>

      {open && (
        <div className="sheet-backdrop" onClick={() => setOpen(false)}>
          <div role="dialog" aria-modal="true" aria-label="Más opciones" className="sheet fade-up" onClick={(e) => e.stopPropagation()}>
            <div className="sheet__handle" />
            <Link href="/dashboard/perfil" onClick={() => setOpen(false)} className="sheet__profile">
              <Avatar size={44} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontWeight: 800, fontSize: 15, color: "var(--text)" }}>Mi perfil</span>
                <span style={{ display: "block", fontSize: 12, color: "var(--text-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userEmail}</span>
              </span>
              <Icon name="chevron-right" size={18} />
            </Link>
            {NAV_GROUP_ORDER.map((group) => {
              const items = NAV_ITEMS.filter((i) => i.group === group && visible.has(i.key));
              if (!items.length) return null;
              return (
                <div key={group} style={{ marginBottom: 10 }}>
                  <p className="sheet__group">{group}</p>
                  <div className="sheet__grid">
                    {items.map((item) => {
                      const active = isItemActive(item, pathname);
                      return (
                        <Link key={item.key} href={item.href} onClick={() => setOpen(false)} className={`sheet__item${active ? " is-active" : ""}`}>
                          <Icon name={NAV_ICON[item.icon] || "book"} size={20} />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            <p className="sheet__group">Apariencia</p>
            <ThemeToggle />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
              <span style={{ fontSize: 12, color: "var(--text-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userEmail}</span>
              <button type="button" onClick={signOut} className="ui-btn ui-btn--ghost ui-btn--sm">Cerrar sesión</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
