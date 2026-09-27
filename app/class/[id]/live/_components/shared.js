"use client";
import AppIcon from "@/components/Icon";

// Iconos propios para los botones de fuente (reemplazan a lucide-react).
export const MicIcon    = ({ size = 24, strokeWidth = 2 }) => <AppIcon name="mic" size={size} strokeWidth={strokeWidth} />;
export const MicOffIcon = ({ size = 24, strokeWidth = 2 }) => <AppIcon name="mic-off" size={size} strokeWidth={strokeWidth} />;
export const CameraIcon = ({ size = 24, strokeWidth = 2 }) => <AppIcon name="camera" size={size} strokeWidth={strokeWidth} />;

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
          <span key={i} style={{ color: "#a78bfa", fontWeight: 600 }}>{part}</span>
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
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(135deg, #7C6CF8 0%, #A78BFA 100%)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 4px 12px rgba(124,108,248,0.3)" }}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="white">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
        </svg>
      </div>
      <span style={{ fontWeight: 700, fontSize: "0.95rem", letterSpacing: "-0.01em", color: "var(--text)" }}>VibeLearning</span>
    </div>
  );
}

export function SourceButton({ colorClass, MainIcon, isRecording, isExpanded, onMainClick, options, selectedKey, onOptionClick }) {
  const isMic    = colorClass === "mic";
  const optColor = isMic ? "#60A5FA" : "#A78BFA";
  const optBg    = isMic ? "rgba(96,165,250,0.22)" : "rgba(167,139,250,0.22)";

  // Fan positions: [left, bottom-center, right] — opens downward to stay within overflow:hidden column
  const fanPositions = [
    { x: -90, y: 90 },
    { x:   0, y: 112 },
    { x:  90, y: 90 },
  ];

  return (
    <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      {/* Radial option pills */}
      {isExpanded && options.map(({ key, icon, label }, idx) => {
        const { x, y } = fanPositions[idx];
        const sel = selectedKey === key;
        return (
          <button
            key={key}
            type="button"
            onClick={(e) => { e.stopPropagation(); onOptionClick(key); }}
            style={{
              position: "absolute",
              top: "50%", left: "50%",
              transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
              background: sel ? optBg : "rgba(13,13,28,0.92)",
              border: `1px solid ${sel ? optColor : "rgba(255,255,255,0.13)"}`,
              borderRadius: 99,
              padding: "5px 12px",
              color: sel ? optColor : "rgba(255,255,255,0.72)",
              fontSize: "0.69rem",
              fontWeight: sel ? 700 : 400,
              cursor: "pointer",
              whiteSpace: "nowrap",
              display: "flex", alignItems: "center", gap: 5,
              zIndex: 50,
              boxShadow: sel ? `0 4px 20px ${optBg}` : "0 4px 20px rgba(0,0,0,0.48)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
              transition: "all 0.12s",
            }}
          >
            <AppIcon name={icon} size={13} />
            <span>{label}</span>
          </button>
        );
      })}

      {/* Main circular button */}
      <div style={{ position: "relative", width: 108, height: 108, display: "grid", placeItems: "center" }}>
        {isRecording && (
          <>
            <span className="mic-ring mic-ring-one" />
            <span className="mic-ring mic-ring-two" />
            <span className="mic-orbit" />
          </>
        )}
        <button
          type="button"
          className={`live-src-btn live-src-btn--${colorClass}${isRecording ? " is-recording" : ""}${isExpanded ? " is-expanded" : ""}`}
          onClick={onMainClick}
        >
          <MainIcon size={36} strokeWidth={2.15} />
        </button>
      </div>

      {/* Waveform / static bar */}
      <div style={{ height: 20, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
        {isRecording ? (
          [0,1,2,3,4].map(bar => <span key={bar} className="mic-level" style={{ animationDelay: `${bar * 90}ms` }} />)
        ) : (
          <span style={{ width: 34, height: 4, borderRadius: 99, background: "rgba(255,255,255,0.11)" }} />
        )}
      </div>

      {/* Label */}
      <span style={{
        fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
        color: isRecording ? "#f87171" : isExpanded ? optColor : "var(--text-2)",
        transition: "color 0.2s",
      }}>
        {isRecording ? "Detener" : isMic ? "Audio" : "Visual"}
      </span>
    </div>
  );
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
  other:       { bg: "rgba(255,255,255,0.08)",  fg: "#9CA3AF", label: "Visual"      },
};
