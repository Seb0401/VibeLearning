"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SECTION_TABS } from "./navConfig";

// Barra de pestañas compartida por las páginas unificadas (se usa desde los layouts de cada route group).
export default function SectionTabs({ section, children }) {
  const pathname = usePathname();
  const tabs = SECTION_TABS[section] || [];

  return (
    <div className="section-shell">
      <div className="section-tabs">
        <div role="tablist" className="section-tablist">
          {tabs.map(({ href, label }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                role="tab"
                aria-selected={active}
                aria-current={active ? "page" : undefined}
                className={`section-tab${active ? " is-active" : ""}`}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </div>
      <div className="section-content">{children}</div>
    </div>
  );
}
