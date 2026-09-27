"use client";
import AppIcon from "@/components/Icon";
import { RI, VibeLearningLogo, formatTimer } from "./shared";

// Cabecera de la clase en vivo: estado de grabación, puntos, PDF y finalizar.
export default function LiveHeader({ accuracy, audioSource, elapsed, finishClass, finishing, materialSummary, pdfUploading, quizStats, recording, score, streak, streakMultiplier, uploadPDF }) {
  return (
    <>
    {/* ── HEADER ── */}
    <header className="class-topbar" style={{ height: 56, flexShrink: 0, background: "var(--sidebar)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", padding: "0 1.5rem", gap: "1.25rem" }}>
      <VibeLearningLogo />

      <div style={{ width: 1, height: 20, background: "var(--border)", flexShrink: 0 }} />

      <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
        <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>Clase en vivo</span>
      </div>

      {recording && (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", display: "inline-block", animation: "pulse 1.5s infinite" }} />
          <span style={{ color: "#f87171", fontSize: "0.82rem", fontWeight: 600 }}>
            {audioSource === "mic" ? "Grabando" : audioSource === "system" ? "Capturando tab" : "Mic + Tab"}
          </span>
          <span style={{ color: "var(--text-muted)", fontSize: "0.82rem", fontVariantNumeric: "tabular-nums" }}>{formatTimer(elapsed)}</span>
        </div>
      )}

      {/* Score display */}
      {(score > 0 || quizStats.total > 0) && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: 20, padding: "4px 12px" }}>
          <span style={{ color: "#FBBF24", fontWeight: 700, fontSize: "0.85rem", display: "inline-flex", alignItems: "center", gap: 5 }}><AppIcon name="star" size={13} /> {score} pts</span>
          {streak >= 2 && (
            <span style={{ color: "#f97316", fontWeight: 700, fontSize: "0.82rem", display: "inline-flex", alignItems: "center", gap: 3 }}><AppIcon name="flame" size={13} />×{streakMultiplier}</span>
          )}
          {accuracy !== null && (
            <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>{quizStats.correct}/{quizStats.total}</span>
          )}
        </div>
      )}

      <label className="btn-ghost" title={materialSummary ? "Reemplazar el PDF de la clase" : "Sube el PDF de la clase para que el chatbot lo use"} style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, background: materialSummary ? "rgba(34,197,94,0.08)" : "var(--surface)", border: `1px solid ${materialSummary ? "rgba(34,197,94,0.25)" : "var(--border)"}`, borderRadius: 8, padding: "6px 12px", fontSize: "0.8rem", color: materialSummary ? "#22C55E" : "var(--text)", userSelect: "none", fontWeight: 500 }}>
        <input type="file" accept=".pdf" onChange={uploadPDF} disabled={pdfUploading} style={{ display: "none" }} />
        {pdfUploading ? <span className="spinner" style={{ width: 13, height: 13 }} /> : <RI s={14}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></RI>}
        {pdfUploading ? "Procesando PDF…" : materialSummary ? "PDF cargado" : "Subir PDF"}
      </label>

      <button
        onClick={finishClass}
        disabled={finishing}
        className="btn-accent"
        style={{ background: "var(--accent)", border: "none", borderRadius: 8, padding: "7px 16px", color: "white", fontWeight: 600, fontSize: "0.85rem", cursor: finishing ? "not-allowed" : "pointer", opacity: finishing ? 0.7 : 1, display: "inline-flex", alignItems: "center", gap: 7 }}
      >
        {finishing && <span className="spinner" style={{ width: 14, height: 14 }} />}
        {finishing ? "Generando resumen…" : "Finalizar clase"}
      </button>
    </header>
    </>
  );
}
