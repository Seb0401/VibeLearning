"use client";
import AppIcon from "@/components/Icon";
import { CameraIcon, HighlightedText, MicIcon, MicOffIcon, SourceButton, TYPE_BADGE } from "./shared";
import Mascot from "@/components/Mascot";

// Columna 2: fuentes de audio/visual + transcript e imágenes.
export default function TranscriptPanel({ analyzeLoading, audioSource, camExpanded, col2Tab, conceptNames, handleCamMainClick, handleCamOption, handleMicMainClick, handleMicOption, micExpanded, recording, setCol2Tab, transcriptEndRef, transcriptLines, visualNotes, visualSource }) {
  return (
    <>
    {/* ── COL 2: TRANSCRIPT ── */}
    <div style={{ order: 2, borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
      <div style={{ padding: "14px 16px 18px", borderBottom: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 12, flexShrink: 0, background: "linear-gradient(180deg, rgba(124,108,248,0.08), rgba(124,108,248,0))", position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", gap: 4, background: "var(--tint-2)", borderRadius: 8, padding: 3 }}>
            <button
              onClick={() => setCol2Tab("transcript")}
              style={{ fontSize: "0.78rem", fontWeight: 600, borderRadius: 6, padding: "5px 12px", cursor: "pointer", border: "none", background: col2Tab === "transcript" ? "var(--accent)" : "transparent", color: col2Tab === "transcript" ? "white" : "var(--text-2)" }}
            >
              Transcript
            </button>
            <button
              onClick={() => setCol2Tab("images")}
              style={{ fontSize: "0.78rem", fontWeight: 600, borderRadius: 6, padding: "5px 12px", cursor: "pointer", border: "none", background: col2Tab === "images" ? "var(--accent)" : "transparent", color: col2Tab === "images" ? "white" : "var(--text-2)", display: "flex", alignItems: "center", gap: 5 }}
            >
              Imágenes {visualNotes.length > 0 && `(${visualNotes.length})`}
            </button>
          </div>
          {recording && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--green)", fontSize: "0.78rem", fontWeight: 600, flexShrink: 0 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", display: "inline-block", animation: "pulse 1.5s infinite" }} />
              <span>Escuchando...</span>
            </div>
          )}
        </div>

        {/* Dos botones de fuente: audio (azul) + visual (morado) */}
        <div style={{ display: "flex", gap: 32, justifyContent: "center", paddingTop: 8 }}>
          <SourceButton
            colorClass="mic"
            MainIcon={recording ? MicOffIcon : MicIcon}
            isRecording={recording}
            isExpanded={micExpanded}
            onMainClick={handleMicMainClick}
            options={[
              { key: "mic",    icon: "mic", label: "Micrófono" },
              { key: "system", icon: "monitor", label: "Pantalla / Tab" },
              { key: "both",   icon: "shuffle", label: "Mic + Tab" },
            ]}
            selectedKey={audioSource}
            onOptionClick={handleMicOption}
          />
          <SourceButton
            colorClass="cam"
            MainIcon={CameraIcon}
            isRecording={false}
            isExpanded={camExpanded}
            onMainClick={handleCamMainClick}
            options={[
              { key: "screenshot", icon: "monitor", label: "Captura" },
              { key: "upload",     icon: "upload", label: "Subir archivo" },
              { key: "camera",     icon: "camera", label: "Cámara" },
            ]}
            selectedKey={visualSource}
            onOptionClick={handleCamOption}
          />
        </div>
      </div>

      {col2Tab === "transcript" ? (
        <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px", minHeight: 0 }}>
          {transcriptLines.length === 0 && (
            <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
              <Mascot pose={recording ? "procesando" : "hola"} size={120} float={recording} style={{ margin: "0 auto 10px" }} />
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", lineHeight: 1.6 }}>
                {recording ? <>Escuchando la clase…<br />La transcripción aparecerá en unos segundos</> : <>Pulsa el micrófono para empezar<br />y la transcripción aparecerá aquí</>}
              </p>
            </div>
          )}
          {transcriptLines.map((line, i) => (
            <div key={i} style={{ display: "flex", gap: 10, marginBottom: 16 }}>
              <div style={{ flexShrink: 0, paddingTop: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)" }} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <span style={{ color: "var(--text-muted)", fontSize: "0.74rem", display: "block", marginBottom: 4 }}>{line.time}</span>
                <span style={{ fontSize: "0.875rem", lineHeight: 1.65 }}>
                  <HighlightedText text={line.text} conceptNames={conceptNames} />
                </span>
              </div>
            </div>
          ))}
          <div ref={transcriptEndRef} />
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px", minHeight: 0 }}>
          {visualNotes.length === 0 && !analyzeLoading && (
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center", marginTop: "2.5rem", lineHeight: 1.6 }}>
              Captura pantalla, cámara o sube un archivo<br />con el botón morado de arriba
            </p>
          )}
          {analyzeLoading && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12, color: "var(--accent)", fontSize: "0.8rem", fontWeight: 600 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", display: "inline-block", animation: "pulse 1.5s infinite" }} />
              Analizando imagen...
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {visualNotes.map((note) => {
              const tb = TYPE_BADGE[note.content_type] || TYPE_BADGE.other;
              return (
                <div key={note.id} style={{ borderRadius: 10, border: "1px solid var(--border)", background: "var(--tint-1)", overflow: "hidden" }}>
                  <div style={{ position: "relative" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- vista previa local (blob:) de la foto */}
                    <img src={note.previewUrl} alt="" style={{ width: "100%", height: 120, objectFit: "cover", display: "block" }} />
                    <span style={{ position: "absolute", top: 6, left: 6, fontSize: "0.65rem", fontWeight: 700, color: tb.fg, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", borderRadius: 99, padding: "3px 8px", border: `1px solid ${tb.fg}40` }}>{tb.label}</span>
                  </div>
                  <div style={{ padding: "9px 10px" }}>
                    <p style={{ fontSize: "0.76rem", color: "var(--text-2)", lineHeight: 1.5, marginBottom: (note.extracted_text || note.gaps) ? 6 : 0 }}>{note.description}</p>
                    {note.extracted_text && (
                      <div style={{ background: "rgba(124,108,248,0.06)", border: "1px solid rgba(124,108,248,0.14)", borderRadius: 6, padding: "5px 8px", marginBottom: note.gaps ? 6 : 0 }}>
                        <span style={{ fontSize: "0.66rem", fontWeight: 700, color: "var(--accent)" }}>OCR: </span>
                        <span style={{ fontSize: "0.66rem", color: "var(--text-2)", fontFamily: "monospace", lineHeight: 1.4 }}>{note.extracted_text.length > 160 ? note.extracted_text.slice(0, 160) + "…" : note.extracted_text}</span>
                      </div>
                    )}
                    {note.gaps && (
                      <div style={{ background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.18)", borderRadius: 6, padding: "5px 8px" }}>
                        <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--yellow)" }}><AppIcon name="alert" size={11} style={{ verticalAlign: "-1px", marginRight: 3 }} />Gap: </span>
                        <span style={{ fontSize: "0.68rem", color: "var(--text-2)" }}>{note.gaps}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
    </>
  );
}
