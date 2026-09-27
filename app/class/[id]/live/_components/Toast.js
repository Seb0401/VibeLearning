"use client";

// Aviso flotante (errores y confirmaciones).
export default function Toast({ setToast, toast }) {
  return (
    <>
    {toast && (
      <div role={toast.type === "error" ? "alert" : "status"} className="fade-up"
        style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 400, maxWidth: "min(460px, calc(100vw - 32px))", display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", borderRadius: 12, background: "var(--card)", border: `1px solid ${toast.type === "error" ? "rgba(239,68,68,0.35)" : "rgba(34,197,94,0.35)"}`, boxShadow: "0 16px 40px rgba(0,0,0,0.45)" }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", marginTop: 6, flexShrink: 0, background: toast.type === "error" ? "#EF4444" : "#22C55E" }} />
        <p style={{ fontSize: "0.83rem", lineHeight: 1.5, color: "var(--text)", flex: 1 }}>{toast.msg}</p>
        <button type="button" onClick={() => setToast(null)} aria-label="Cerrar aviso" className="link-muted" style={{ background: "none", border: "none", color: "var(--text-3)", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>
      </div>
    )}
    </>
  );
}
