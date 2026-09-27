"use client";
import MindMap from "@/components/MindMap";
import ObsidianCanvas from "@/app/components/ObsidianCanvas";
import SummaryMarkdown from "@/components/SummaryMarkdown";
import AppIcon, { IconBadge } from "@/components/Icon";
import { RI, VibeLearningLogo } from "./shared";
import Mascot from "@/components/Mascot";

// Reporte al finalizar la clase: métricas, resumen, mapas y chat de repaso.
export default function FinalReport({ canvasError, canvasLoading, canvasNodes, concepts, downloadTranscript, elapsed, fetchCanvasData, finalData, isMapFullscreen, mapCardRef, materialSummary, reportChatEndRef, reportChatHistory, reportChatInput, reportChatLoading, sendReportChat, setReportChatInput, toggleMapFullscreen, transcriptLines }) {
    const durationFmt = (() => {
      if (elapsed <= 0) return null;
      const m = Math.floor(elapsed / 60);
      const s = elapsed % 60;
      if (m === 0) return `${s}s`;
      return s > 0 ? `${m} min ${s}s` : `${m} min`;
    })();
    const finalAccuracy = finalData.quizStats?.total > 0
      ? Math.round((finalData.quizStats.correct / finalData.quizStats.total) * 100)
      : null;

    return (
      <div className="class-view" style={{ height: "100vh", display: "flex", flexDirection: "column", background: "var(--bg)", overflow: "hidden" }}>

        {/* ── HEADER ── */}
        <header className="class-topbar" style={{ height: 56, flexShrink: 0, background: "var(--sidebar)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", padding: "0 1.25rem", gap: "1rem" }}>
          <VibeLearningLogo />
          <div style={{ width: 1, height: 20, background: "var(--border)", flexShrink: 0 }} />
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(34,197,94,0.1)", color: "var(--green)", border: "1px solid rgba(34,197,94,0.2)", fontSize: 11, fontWeight: 600, borderRadius: 99, padding: "3px 10px", flexShrink: 0 }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#22C55E", display: "inline-block" }} />
            Clase completada
          </span>
          <span style={{ fontWeight: 600, fontSize: "0.9rem", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text)" }}>{finalData.title}</span>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            {transcriptLines.length > 0 && (
              <button onClick={downloadTranscript} style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 8, padding: "5px 14px", color: "var(--text-2)", fontSize: "0.82rem", fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                <RI s={13}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></RI>
                Transcript .txt
              </button>
            )}
            <button onClick={() => (window.location.href = "/class/new")} style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 8, padding: "5px 14px", color: "var(--text-2)", fontSize: "0.82rem", fontWeight: 500, cursor: "pointer" }}>
              Nueva clase
            </button>
            <button onClick={() => (window.location.href = "/dashboard")} style={{ background: "var(--accent)", border: "none", borderRadius: 8, padding: "6px 16px", color: "white", fontWeight: 600, fontSize: "0.82rem", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              Dashboard <RI s={13}><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></RI>
            </button>
          </div>
        </header>

        {/* ── BODY ── */}
        <div className="class-body report-body" style={{ display: "flex", flex: 1, overflow: "hidden" }}>

          {/* MAIN REPORT AREA */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto" }}>

            {/* Felicitación */}
            <div className="report-hero">
              <Mascot pose="completado" size={92} halo={false} />
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.01em" }}>¡Clase completada!</p>
                <p style={{ fontSize: 13, color: "var(--text-2)", marginTop: 3 }}>Tu resumen, el mapa mental y los conceptos ya están guardados. Repásalos cuando quieras.</p>
              </div>
            </div>

            {/* Metrics row */}
            <div className="metrics-row" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, padding: "14px 16px", flexShrink: 0, borderBottom: "1px solid var(--border)" }}>
              {[
                { icon: <RI s={15}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></RI>, bg: "rgba(124,108,248,0.12)", fg: "var(--accent)", label: "Conceptos", val: concepts.length || 0 },
                { icon: <RI s={15}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></RI>, bg: "rgba(96,165,250,0.12)", fg: "#60A5FA", label: "Duración", val: durationFmt || "—" },
                { icon: <RI s={15}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></RI>, bg: "rgba(251,191,36,0.12)", fg: "#FBBF24", label: "Puntos", val: finalData.score ?? 0 },
                { icon: <RI s={15}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></RI>, bg: finalAccuracy !== null ? "rgba(34,197,94,0.12)" : "var(--tint-2)", fg: finalAccuracy !== null ? "#22C55E" : "var(--text-3)", label: "Precisión", val: finalAccuracy !== null ? `${finalAccuracy}%` : "—" },
                { icon: <RI s={15}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></RI>, bg: materialSummary ? "rgba(251,191,36,0.12)" : "var(--tint-2)", fg: materialSummary ? "var(--yellow)" : "var(--text-3)", label: "Material", val: materialSummary ? "PDF" : "Sin PDF" },
              ].map(({ icon, bg, fg, label, val }, i) => (
                <div key={i} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: bg, color: fg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{icon}</div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em", lineHeight: 1 }}>{val}</p>
                    <p style={{ fontSize: 10, color: "var(--text-2)", marginTop: 3 }}>{label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary + MindMap */}
            <div className="report-row" style={{ height: "560px", display: "flex", flexShrink: 0, padding: "14px 16px", gap: 12 }}>

              {/* AI Summary */}
              {finalData.final_summary && (
                <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, display: "flex", flexDirection: "column", flex: "0 1 42%", minWidth: 0, minHeight: 0, overflow: "hidden" }}>
                  <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 9, flexShrink: 0 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--accent-dim)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <RI s={14}><path d="m12 3-1.9 5.8a2 2 0 0 1-1.287 1.288L3 12l5.8 1.9a2 2 0 0 1 1.288 1.287L12 21l1.9-5.8a2 2 0 0 1 1.287-1.288L21 12l-5.8-1.9a2 2 0 0 1-1.288-1.287Z"/></RI>
                    </div>
                    <div>
                      <h2 style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>Resumen IA</h2>
                      <p style={{ fontSize: 10, color: "var(--text-3)" }}>Análisis de tu sesión</p>
                    </div>
                  </div>
                  <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px", fontSize: 13, color: "var(--text-2)", lineHeight: 1.7 }}>
                    <SummaryMarkdown text={finalData.final_summary} />
                  </div>
                </div>
              )}

              {/* MindMap */}
              {finalData.final_mindmap && (
                <div ref={mapCardRef} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, display: "flex", flexDirection: "column", flex: "1 1 58%", minWidth: 0, minHeight: 0, overflow: "hidden" }}>
                  <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 9, flexShrink: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(96,165,250,0.1)", color: "var(--blue)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <RI s={14}><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></RI>
                      </div>
                      <div>
                        <h2 style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>Mapa mental</h2>
                        <p style={{ fontSize: 10, color: "var(--text-3)" }}>Visualización de conceptos</p>
                      </div>
                    </div>
                    <button onClick={toggleMapFullscreen} style={{ background: isMapFullscreen ? "var(--accent-dim)" : "var(--tint-2)", border: `1px solid ${isMapFullscreen ? "var(--accent)" : "var(--border)"}`, borderRadius: 8, padding: "5px 7px", color: isMapFullscreen ? "var(--accent)" : "var(--text-2)", cursor: "pointer", display: "flex", alignItems: "center", flexShrink: 0 }}>
                      {isMapFullscreen
                        ? <RI s={13}><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></RI>
                        : <RI s={13}><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></RI>
                      }
                    </button>
                  </div>
                  <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
                    <MindMap markdown={finalData.final_mindmap} />
                  </div>
                </div>
              )}
            </div>

            {/* Obsidian Canvas */}
            <div style={{ padding: "0 16px 24px", flexShrink: 0 }}>
              <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
                <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 9, flexShrink: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(124, 108, 248, 0.1)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <AppIcon name="network" size={15} />
                    </div>
                    <div>
                      <h2 style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>Mapa de conocimiento</h2>
                      <p style={{ fontSize: 10, color: "var(--text-3)" }}>Explora los conceptos y sus relaciones de manera interactiva</p>
                    </div>
                  </div>
                  {canvasLoading && (
                    <span style={{ fontSize: 11, color: "var(--accent)", fontWeight: 600 }}>Generando mapa...</span>
                  )}
                </div>
                <div style={{ padding: "12px 16px" }}>
                  {canvasLoading ? (
                    <div style={{ height: "300px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "10px" }}>
                      <div className="animate-spin" style={{ width: "30px", height: "30px", border: "3px solid var(--border)", borderTopColor: "var(--accent)", borderRadius: "50%" }} />
                      <span style={{ fontSize: "12px", color: "var(--text-3)" }}>El Asistente IA está extrayendo relaciones tridimensionales de la clase...</span>
                    </div>
                  ) : canvasError || canvasNodes.length === 0 ? (
                    <div style={{ height: "200px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px" }}>
                      <span style={{ fontSize: "13px", color: "var(--text-3)" }}>No se pudo cargar el mapa de conocimiento o no hay conceptos suficientes.</span>
                      <button onClick={fetchCanvasData} style={{ background: "var(--accent)", border: "none", borderRadius: 8, padding: "6px 16px", color: "white", fontWeight: 600, fontSize: "0.82rem", cursor: "pointer" }}>
                        Reintentar generación
                      </button>
                    </div>
                  ) : (
                    <ObsidianCanvas nodes={canvasNodes} />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT PANEL: CHATBOT */}
          <div className="report-chat" style={{ width: 360, flexShrink: 0, display: "flex", flexDirection: "column", borderLeft: "1px solid var(--border)", background: "var(--card)", overflow: "hidden" }}>
            <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--accent-dim)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}><AppIcon name="sparkles" size={15} /></div>
                <div>
                  <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>Asistente IA</h2>
                  <p style={{ fontSize: 11, color: "var(--text-3)" }}>Pregunta sobre la clase</p>
                </div>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px 0" }}>
              {reportChatHistory.length === 0 && (
                <div style={{ textAlign: "center", marginTop: "4rem" }}>
                  <IconBadge name="sparkles" size={48} style={{ margin: "0 auto 12px" }} />
                  <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", lineHeight: 1.6 }}>Haz una pregunta sobre los<br />conceptos o el contenido de la clase</p>
                </div>
              )}
              {reportChatHistory.map((msg, i) => (
                <div key={i} style={{ marginBottom: 12, display: "flex", flexDirection: msg.role === "user" ? "row-reverse" : "row", gap: 8, alignItems: "flex-start" }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: msg.role === "user" ? "var(--accent)" : "linear-gradient(135deg,#7c6df2,#a78bfa)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "white", fontWeight: 700, fontSize: msg.role === "user" ? "0.7rem" : "0.85rem" }}>
                    {msg.role === "user" ? "Tú" : <AppIcon name="bot" size={14} />}
                  </div>
                  <div style={{ maxWidth: "76%", background: msg.role === "user" ? "var(--accent)" : "var(--surface)", border: msg.role === "ai" ? "1px solid var(--border)" : "none", borderRadius: msg.role === "user" ? "12px 4px 12px 12px" : "4px 12px 12px 12px", padding: "8px 11px", fontSize: "0.82rem", lineHeight: 1.55, color: msg.role === "user" ? "white" : "var(--text)" }}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {reportChatLoading && (
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 12 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#7c6df2,#a78bfa)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "white" }}><AppIcon name="bot" size={14} /></div>
                  <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "4px 12px 12px 12px", padding: "10px 14px" }}><span className="typing-dots" aria-label="Pensando"><span /><span /><span /></span></div>
                </div>
              )}
              <div ref={reportChatEndRef} />
            </div>

            <div style={{ padding: "10px 14px 14px", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
              <form onSubmit={sendReportChat} style={{ display: "flex", gap: 8 }}>
                <input
                  value={reportChatInput}
                  onChange={(e) => setReportChatInput(e.target.value)}
                  placeholder="Pregunta sobre la clase..."
                  className="input"
                  style={{ flex: 1, background: "var(--surface)", borderRadius: 10, padding: "8px 12px", fontSize: "0.83rem" }}
                />
                <button
                  type="submit"
                  disabled={reportChatLoading || !reportChatInput.trim()}
                  aria-label="Enviar pregunta"
                  className="btn-accent"
                  style={{ width: 36, height: 36, borderRadius: 10, background: "var(--accent)", border: "none", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: reportChatLoading || !reportChatInput.trim() ? 0.45 : 1, flexShrink: 0 }}
                >
                  <RI s={15}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></RI>
                </button>
              </form>
              <p style={{ fontSize: "0.67rem", color: "var(--text-muted)", marginTop: 7, textAlign: "center" }}>
                VibeLearning puede cometer errores. Verifica la información importante.
              </p>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        `}</style>
      </div>
    );
}
