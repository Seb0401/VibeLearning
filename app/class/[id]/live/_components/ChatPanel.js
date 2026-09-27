"use client";
import AppIcon, { IconBadge } from "@/components/Icon";
import { RI } from "./shared";

// Columna 3: chatbot RAG en vivo.
export default function ChatPanel({ chatEndRef, chatHistory, chatLoading, chatQuestion, handleChatSubmit, materialSummary, sendChatText, setChatQuestion }) {
  return (
    <>
    {/* ── COL 3: CHATBOT ── */}
    <div style={{ order: 3, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ color: "var(--accent)", display: "flex" }}><AppIcon name="sparkles" size={16} /></span>
          <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>Chatbot RAG</span>
        </div>
        {materialSummary && (
          <span style={{ fontSize: "0.72rem", color: "var(--green)", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 99, padding: "2px 9px", fontWeight: 600 }}>Con PDF</span>
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px 0" }}>
        {chatHistory.length === 0 && (
          <div style={{ textAlign: "center", marginTop: "4rem" }}>
            <IconBadge name="sparkles" size={52} style={{ margin: "0 auto 12px" }} />
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", lineHeight: 1.6 }}>Hazme una pregunta sobre la clase<br />y te responderé con el contexto del material</p>
          </div>
        )}
        {chatHistory.map((msg, i) => (
          <div key={i} style={{ marginBottom: 14, display: "flex", flexDirection: msg.role === "user" ? "row-reverse" : "row", gap: 8, alignItems: "flex-start" }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: msg.role === "user" ? "var(--accent)" : "linear-gradient(135deg,#7c6df2,#a78bfa)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "white", fontWeight: 700, fontSize: msg.role === "user" ? "0.75rem" : "0.9rem" }}>
              {msg.role === "user" ? "Tú" : <AppIcon name="bot" size={15} />}
            </div>
            <div style={{ maxWidth: "76%", background: msg.role === "user" ? "var(--accent)" : "var(--surface)", border: msg.role === "ai" ? "1px solid var(--border)" : "none", borderRadius: msg.role === "user" ? "12px 4px 12px 12px" : "4px 12px 12px 12px", padding: "9px 12px", fontSize: "0.83rem", lineHeight: 1.55, color: msg.role === "user" ? "white" : "var(--text)" }}>
              {msg.text}
            </div>
          </div>
        ))}
        {chatLoading && (
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 14 }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg,#7c6df2,#a78bfa)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "white" }}><AppIcon name="bot" size={15} /></div>
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "4px 12px 12px 12px", padding: "11px 14px" }}><span className="typing-dots" aria-label="Pensando"><span /><span /><span /></span></div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {chatHistory.length > 0 && !chatLoading && (
        <div style={{ padding: "10px 14px", flexShrink: 0 }}>
          <p style={{ fontSize: "0.71rem", color: "var(--text-muted)", marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Sugerencias de seguimiento</p>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {[
              { icon: "puzzle", text: "Explícalo más simple" },
              { icon: "lightbulb", text: "Dame un ejemplo" },
              { icon: "target", text: "Genera otra pregunta" },
            ].map(({ icon, text }) => (
              <button
                key={text}
                onClick={() => sendChatText(text)}
                className="chip-btn"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 20, padding: "4px 10px", fontSize: "0.74rem", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
              >
                <AppIcon name={icon} size={12} /> {text}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ padding: "10px 14px 14px", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
        <form onSubmit={handleChatSubmit} style={{ display: "flex", gap: 8 }}>
          <input
            value={chatQuestion}
            onChange={(e) => setChatQuestion(e.target.value)}
            placeholder="Escribe tu pregunta..."
            aria-label="Pregunta para el chatbot"
            className="input"
            style={{ flex: 1, background: "var(--surface)", borderRadius: 10, padding: "8px 12px", fontSize: "0.83rem" }}
          />
          <button
            type="submit"
            disabled={chatLoading || !chatQuestion.trim()}
            aria-label="Enviar pregunta"
            className="btn-accent"
            style={{ width: 36, height: 36, borderRadius: 10, background: "var(--accent)", border: "none", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: chatLoading || !chatQuestion.trim() ? 0.45 : 1, flexShrink: 0 }}
          >
            <RI s={15}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></RI>
          </button>
        </form>
        <p style={{ fontSize: "0.67rem", color: "var(--text-muted)", marginTop: 7, textAlign: "center" }}>
          VibeLearning puede cometer errores. Verifica la información importante.
        </p>
      </div>
    </div>
    </>
  );
}
