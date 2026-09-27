"use client";
import AppIcon from "@/components/Icon";
import BrandLogo from "@/components/Logo";

export function formatTimer(s) {
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function nowHMS() {
  return new Date().toLocaleTimeString("es-MX", { hour12: false });
}

export function wordCount(text) {
  return (text || "").trim().split(/\s+/).filter(Boolean).length;
}

export function HighlightedText({ text, conceptNames }) {
  if (!conceptNames.length) return <span>{text}</span>;
  const escaped = conceptNames.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp(`(${escaped.join("|")})`, "gi");
  const parts = text.split(pattern);
  return (
    <span>
      {parts.map((part, i) =>
        conceptNames.some((n) => n.toLowerCase() === part.toLowerCase()) ? (
          <span key={i} style={{ color: "var(--violet)", fontWeight: 600 }}>{part}</span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}

/* ── Post-class report helpers ────────────────────────────────────────── */
export function RI({ s = 16, children }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

export function VibeLearningLogo() {
  return <BrandLogo size={30} textSize={18} />;
}

export const TYPE_BADGE = {
  whiteboard:  { bg: "rgba(20,184,166,0.15)",  fg: "#2DD4BF", label: "Pizarrón"    },
  slide:       { bg: "rgba(96,165,250,0.15)",   fg: "#60A5FA", label: "Diapositiva" },
  diagram:     { bg: "rgba(124,108,248,0.15)",  fg: "#A78BFA", label: "Diagrama"    },
  graph:       { bg: "rgba(34,197,94,0.15)",    fg: "#22C55E", label: "Gráfico"     },
  formula:     { bg: "rgba(251,191,36,0.15)",   fg: "#FBBF24", label: "Fórmula"     },
  table:       { bg: "rgba(249,115,22,0.15)",   fg: "#FB923C", label: "Tabla"       },
  screenshot:  { bg: "rgba(99,102,241,0.15)",   fg: "#818CF8", label: "Captura"     },
  photo:       { bg: "rgba(239,68,68,0.15)",    fg: "#F87171", label: "Foto"        },
  other:       { bg: "var(--tint-4)",  fg: "#9CA3AF", label: "Visual"      },
};
