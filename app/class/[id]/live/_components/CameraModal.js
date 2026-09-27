"use client";
import AppIcon from "@/components/Icon";

// Modal para tomar una foto con la cámara.
export default function CameraModal({ cameraVideoRef, captureFromCamera, closeCamera, showCamera }) {
  return (
    <>
    {showCamera && (
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ background: "var(--card)", border: "1px solid var(--border-strong)", borderRadius: 20, padding: 24, width: 480, maxWidth: "92vw" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <span style={{ fontWeight: 700, fontSize: "0.95rem", display: "flex", alignItems: "center", gap: 7 }}><AppIcon name="camera" size={17} /> Tomar foto</span>
            <button onClick={closeCamera} style={{ background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 6, color: "var(--text-2)", cursor: "pointer", fontSize: 18, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
          </div>
          <video ref={cameraVideoRef} autoPlay playsInline muted style={{ width: "100%", borderRadius: 12, background: "#000", display: "block", maxHeight: 320, objectFit: "cover" }} />
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <button onClick={captureFromCamera} className="btn-accent" style={{ flex: 1, background: "var(--accent)", color: "white", border: "none", borderRadius: "var(--radius-btn)", padding: "11px", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
              <AppIcon name="camera" size={16} style={{ verticalAlign: "-3px", marginRight: 6 }} />Capturar
            </button>
            <button onClick={closeCamera} className="btn-ghost" style={{ flex: 1, background: "transparent", color: "var(--text-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-btn)", padding: "11px", fontWeight: 500, fontSize: 14, cursor: "pointer" }}>
              Cancelar
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
