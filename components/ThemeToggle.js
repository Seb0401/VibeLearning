"use client";
import { useSyncExternalStore } from "react";
import Icon from "./Icon";

// Preferencia de tema: "light" | "dark" | "system". Se guarda en localStorage("vl-theme")
// y se aplica como <html data-theme="light|dark">. El script de app/layout.js la aplica
// antes del primer pintado para evitar el parpadeo.
const KEY = "vl-theme";
const listeners = new Set();

function readPref() {
  try { return localStorage.getItem(KEY) || "system"; } catch { return "system"; }
}

export function applyTheme(pref) {
  const dark = pref === "dark" || (pref === "system" && !window.matchMedia("(prefers-color-scheme: light)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}

function subscribe(cb) {
  listeners.add(cb);
  const mq = window.matchMedia("(prefers-color-scheme: light)");
  const onSystem = () => { if (readPref() === "system") applyTheme("system"); cb(); };
  mq.addEventListener("change", onSystem);
  return () => { listeners.delete(cb); mq.removeEventListener("change", onSystem); };
}

function setPref(pref) {
  try { localStorage.setItem(KEY, pref); } catch {}
  applyTheme(pref);
  listeners.forEach((l) => l());
}

const OPTIONS = [
  { key: "light",  label: "Claro",   icon: "sun" },
  { key: "dark",   label: "Oscuro",  icon: "moon" },
  { key: "system", label: "Sistema", icon: "monitor" },
];

export default function ThemeToggle({ compact = false }) {
  const pref = useSyncExternalStore(subscribe, readPref, () => "system");
  return (
    <div role="radiogroup" aria-label="Tema de la interfaz" className="theme-toggle">
      {OPTIONS.map((o) => (
        <button
          key={o.key}
          type="button"
          role="radio"
          aria-checked={pref === o.key}
          title={o.label}
          onClick={() => setPref(o.key)}
          className={`theme-toggle__opt${pref === o.key ? " is-active" : ""}`}
        >
          <Icon name={o.icon} size={14} />
          {!compact && <span>{o.label}</span>}
        </button>
      ))}
    </div>
  );
}
