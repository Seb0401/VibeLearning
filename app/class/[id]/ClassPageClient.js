"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import MindMap from "@/components/MindMap";

function RI({ s = 16, children }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

function stripMd(text) {
  return (text || "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/^[-*]\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function HighlightedSummary({ text, concepts }) {
  const plain = stripMd(text);
  const paras = plain.split(/\n{2,}/).filter(Boolean).slice(0, 4);
  const fullText = paras.join(" ");

  if (!concepts.length) {
    return <p style={{ fontSize: 14, color: "var(--text-2)", lineHeight: 1.75, margin: 0 }}>{fullText}</p>;
  }

  const names = concepts
    .map(c => (typeof c === "string" ? c : c.name))
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  const escaped = names.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const parts = fullText.split(new RegExp(`(${escaped})`, "gi"));

  return (
    <p style={{ fontSize: 14, color: "var(--text-2)", lineHeight: 1.75, margin: 0 }}>
      {parts.map((part, i) => {
        const isMatch = names.some(n => n.toLowerCase() === part.toLowerCase());
        return isMatch
          ? <span key={i} style={{ color: "var(--accent)", fontWeight: 500 }}>{part}</span>
          : part;
      })}
    </p>
  );
}

function estimateDuration(transcript) {
  if (!transcript) return null;
  const m = Math.round(transcript.trim().split(/\s+/).filter(Boolean).length / 130);
  return m >= 1 ? `${m} min` : null;
}

function fmtTime(date) {
  return date.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false });
}

const QUIZ_TABS = ["5 preguntas rápidas", "Modo examen", "Solo fallados"];
const QUICK_ACTIONS = [
  { label: "Explicado más simple", icon: <><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></> },
  { label: "Dame un ejemplo",       icon: <><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></> },
  { label: "Hazme un repaso",        icon: <><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></> },
];
const OPTION_KEYS = ["A", "B", "C", "D"];

export default function ClassPageClient({ cls }) {
  const { transcript, concepts = [], material_summary, final_summary, final_mindmap } = cls.data ?? {};
  const duration = estimateDuration(transcript);

  const [quizTab, setQuizTab]     = useState(0);
  const [quizQ, setQuizQ]         = useState(null);
  const [selected, setSelected]   = useState(null);
  const [quizLoading, setQuizLoading] = useState(false);

  const [messages, setMessages]   = useState([]);
  const [input, setInput]         = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const msgsEndRef = useRef(null);
  const mapContainerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    msgsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatLoading]);

  useEffect(() => {
    function onFsChange() { setIsFullscreen(!!document.fullscreenElement); }
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  async function toggleFullscreen() {
    if (!document.fullscreenElement) {
      await mapContainerRef.current?.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  }

  async function generateQuiz() {
    if (!concepts.length || quizLoading) return;
    setQuizLoading(true);
    setSelected(null);
    setQuizQ(null);
    try {
      const r = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ concepts }),
      });
      const data = await r.json();
      if (!data.skip) setQuizQ(data);
    } catch {}
    setQuizLoading(false);
  }

  async function sendMessage(text) {
    const q = (text ?? input).trim();
    if (!q || chatLoading) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: q, time: fmtTime(new Date()) }]);
    setChatLoading(true);
    try {
      const r = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, material_summary: material_summary || "", transcript: transcript || "" }),
      });
      const data = await r.json();
      setMessages(prev => [...prev, { role: "ai", content: data.answer || "Sin respuesta.", time: fmtTime(new Date()) }]);
    } catch {
      setMessages(prev => [...prev, { role: "ai", content: "Error al conectar con la IA.", time: fmtTime(new Date()) }]);
    }
    setChatLoading(false);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  function optionStyle(key) {
    const isSelected = selected === key;
    const isCorrect  = quizQ?.correct === key;
    const revealed   = selected !== null;
    if (!revealed) return {
      base:   { background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", color: "var(--text-2)" },
      letter: { background: "rgba(255,255,255,0.07)", color: "var(--text-3)" },
    };
    if (isCorrect) return {
      base:   { background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.4)", color: "#22C55E" },
      letter: { background: "rgba(34,197,94,0.15)", color: "#22C55E" },
    };
    if (isSelected) return {
      base:   { background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.35)", color: "#EF4444" },
      letter: { background: "rgba(239,68,68,0.15)", color: "#EF4444" },
    };
    return {
      base:   { background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", color: "var(--text-3)", opacity: 0.45 },
      letter: { background: "rgba(255,255,255,0.04)", color: "var(--text-3)" },
    };
  }

  const COL = { display: "flex", flexDirection: "column", overflow: "hidden" };
  const PANEL_HDR = {
    padding: "18px 22px 14px", flexShrink: 0,
    display: "flex", alignItems: "center", justifyContent: "space-between",
    borderBottom: "1px solid var(--border)",
  };
  const HDR_ICON = { display: "flex", alignItems: "center", gap: 8 };
  const SPARKLE = (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.9 5.8a2 2 0 0 1-1.287 1.288L3 12l5.8 1.9a2 2 0 0 1 1.288 1.287L12 21l1.9-5.8a2 2 0 0 1 1.287-1.288L21 12l-5.8-1.9a2 2 0 0 1-1.288-1.287Z"/>
    </svg>
  );
  const BOT_ICON = (size = 16) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="10" x="3" y="11" rx="2"/>
      <circle cx="12" cy="5" r="2"/>
      <path d="M12 7v4"/>
      <line x1="8" y1="16" x2="8" y2="16"/>
      <line x1="16" y1="16" x2="16" y2="16"/>
    </svg>
  );

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "var(--bg)", overflow: "hidden" }}>

      {/* ── TOP BAR ── */}
      <div style={{ height: 54, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 22px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link href="/dashboard" style={{ textDecoration: "none", color: "var(--text-3)", display: "flex", alignItems: "center", padding: 4 }}>
            <RI s={15}><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></RI>
          </Link>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", letterSpacing: "-0.01em", maxWidth: 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {cls.title}
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(34,197,94,0.1)", color: "#22C55E", border: "1px solid rgba(34,197,94,0.2)", fontSize: 11, fontWeight: 600, borderRadius: 99, padding: "3px 10px", flexShrink: 0 }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#22C55E", display: "inline-block" }} />
            Guardada
          </span>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <Link href="/dashboard" style={{ textDecoration: "none" }}>
            <button className="btn-ghost" style={{ background: "transparent", color: "var(--text-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-btn)", padding: "7px 16px", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
              Dashboard
            </button>
          </Link>
          {transcript && (
            <a href={`data:text/plain;charset=utf-8,${encodeURIComponent(transcript)}`} download={`${cls.title}.txt`} style={{ textDecoration: "none" }}>
              <button className="btn-accent" style={{ background: "var(--accent)", color: "white", border: "none", borderRadius: "var(--radius-btn)", padding: "7px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                <RI s={13}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></RI>
                Transcript
              </button>
            </a>
          )}
        </div>
      </div>

      {/* ── 3 COLUMNS ── */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", overflow: "hidden" }}>

        {/* ── LEFT: RESUMEN + QUIZ ── */}
        <div style={{ ...COL, borderRight: "1px solid var(--border)" }}>
          <div style={PANEL_HDR}>
            <div style={HDR_ICON}>
              {SPARKLE}
              <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", margin: 0 }}>Resumen inteligente</h2>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "20px 22px 24px", display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Summary with highlights */}
            {final_summary && (
              <HighlightedSummary text={final_summary} concepts={concepts} />
            )}

            {/* Stats chips */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {duration && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "var(--card)", border: "1px solid var(--border)", color: "var(--text-2)", fontSize: 11, fontWeight: 500, borderRadius: 99, padding: "5px 12px" }}>
                  <RI s={11}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></RI>
                  {duration}
                </span>
              )}
              {concepts.length > 0 && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "var(--card)", border: "1px solid var(--border)", color: "var(--text-2)", fontSize: 11, fontWeight: 500, borderRadius: 99, padding: "5px 12px" }}>
                  <RI s={11}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></RI>
                  {concepts.length} conceptos
                </span>
              )}
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "var(--card)", border: "1px solid var(--border)", color: "var(--text-2)", fontSize: 11, fontWeight: 500, borderRadius: 99, padding: "5px 12px" }}>
                <RI s={11}><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></RI>
                Nivel: Intermedio
              </span>
            </div>

            {/* Quiz generator */}
            {concepts.length > 0 && (
              <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
                {/* Quiz header */}
                <div style={{ padding: "14px 18px 12px", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
                    <RI s={14}><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6M9 12h6M9 15h4"/></RI>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>Generador de quiz</span>
                  </div>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {QUIZ_TABS.map((tab, i) => (
                      <button
                        key={i}
                        onClick={() => setQuizTab(i)}
                        style={{
                          fontSize: 11, fontWeight: 600, borderRadius: 99, padding: "4px 11px",
                          cursor: "pointer", border: "none",
                          background: quizTab === i ? "var(--accent)" : "rgba(255,255,255,0.06)",
                          color: quizTab === i ? "white" : "var(--text-2)",
                        }}
                      >{tab}</button>
                    ))}
                  </div>
                </div>

                {/* Quiz body */}
                <div style={{ padding: "14px 18px" }}>
                  {quizQ ? (
                    <>
                      <p style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", lineHeight: 1.55, marginBottom: 12 }}>
                        {quizQ.question}
                      </p>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, marginBottom: 14 }}>
                        {OPTION_KEYS.map(key => {
                          const { base, letter } = optionStyle(key);
                          const showCheck = selected !== null && quizQ.correct === key;
                          return (
                            <button
                              key={key}
                              onClick={() => { if (!selected) setSelected(key); }}
                              style={{ ...base, borderRadius: 10, padding: "9px 11px", display: "flex", alignItems: "center", gap: 8, cursor: selected ? "default" : "pointer", textAlign: "left" }}
                            >
                              <span style={{ ...letter, width: 22, height: 22, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                                {showCheck ? "✓" : key}
                              </span>
                              <span style={{ fontSize: 12, lineHeight: 1.35 }}>{quizQ.options[key]}</span>
                            </button>
                          );
                        })}
                      </div>
                      {selected && (
                        <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 12, color: selected === quizQ.correct ? "#22C55E" : "#EF4444" }}>
                          {selected === quizQ.correct ? "¡Correcto! 🎉" : `Incorrecto. La respuesta correcta era ${quizQ.correct}.`}
                        </p>
                      )}
                    </>
                  ) : (
                    <p style={{ fontSize: 13, color: "var(--text-3)", lineHeight: 1.55, marginBottom: 12 }}>
                      {quizLoading ? "Generando pregunta..." : "Presiona el botón para practicar con los conceptos de esta clase."}
                    </p>
                  )}
                  <button
                    onClick={generateQuiz}
                    disabled={quizLoading}
                    style={{
                      width: "100%", background: "var(--accent)", color: "white", border: "none",
                      borderRadius: "var(--radius-btn)", padding: "10px 16px",
                      fontWeight: 600, fontSize: 13, cursor: quizLoading ? "default" : "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      opacity: quizLoading ? 0.65 : 1,
                    }}
                  >
                    {SPARKLE}
                    {quizLoading ? "Generando..." : "Generar quiz"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── CENTER: MAPA MENTAL ── */}
        <div style={{ ...COL, borderRight: "1px solid var(--border)" }}>
          <div style={PANEL_HDR}>
            <div style={HDR_ICON}>
              {SPARKLE}
              <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", margin: 0 }}>Mapa mental</h2>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={toggleFullscreen} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", borderRadius: 8, padding: "5px 7px", color: "var(--text-2)", cursor: "pointer", display: "flex", alignItems: "center" }}>
                <RI s={13}><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></RI>
              </button>
              <button onClick={toggleFullscreen} style={{ background: isFullscreen ? "var(--accent-dim)" : "rgba(255,255,255,0.05)", border: `1px solid ${isFullscreen ? "var(--accent)" : "var(--border)"}`, borderRadius: 8, padding: "5px 7px", color: isFullscreen ? "var(--accent)" : "var(--text-2)", cursor: "pointer", display: "flex", alignItems: "center" }}>
                {isFullscreen
                  ? <RI s={13}><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></RI>
                  : <RI s={13}><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></RI>
                }
              </button>
            </div>
          </div>

          <div ref={mapContainerRef} style={{ flex: 1, overflow: "hidden", padding: "12px", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
            {final_mindmap ? (
              <MindMap markdown={final_mindmap} />
            ) : (
              <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-3)", fontSize: 13 }}>
                Sin mapa mental disponible
              </div>
            )}
          </div>

          {concepts.length > 0 && (
            <div style={{ padding: "10px 22px 14px", borderTop: "1px solid var(--border)", textAlign: "center", flexShrink: 0 }}>
              <span style={{ fontSize: 12, color: "var(--text-3)", fontWeight: 500 }}>{concepts.length} conceptos clave</span>
            </div>
          )}
        </div>

        {/* ── RIGHT: AGENTE DE ESTUDIO ── */}
        <div style={COL}>
          <div style={PANEL_HDR}>
            <div style={HDR_ICON}>
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="10" x="3" y="11" rx="2"/>
                <circle cx="12" cy="5" r="2"/>
                <path d="M12 7v4"/>
                <line x1="8" y1="16" x2="8" y2="16"/>
                <line x1="16" y1="16" x2="16" y2="16"/>
              </svg>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", margin: 0 }}>Agente de estudio</h2>
            </div>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 500, color: "#22C55E" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22C55E", display: "inline-block" }} />
              Basado en esta clase
            </span>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "14px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
            {messages.length === 0 && !chatLoading && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, color: "var(--text-3)", padding: "32px 0" }}>
                <svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.35 }}>
                  <rect width="18" height="10" x="3" y="11" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/>
                </svg>
                <p style={{ fontSize: 12, textAlign: "center", maxWidth: 180, lineHeight: 1.6, margin: 0 }}>Pregúntame cualquier cosa sobre esta clase</p>
              </div>
            )}

            {messages.map((msg, i) => (
              msg.role === "user" ? (
                <div key={i} style={{ alignSelf: "flex-end", maxWidth: "80%" }}>
                  <div style={{ background: "rgba(124,108,248,0.15)", border: "1px solid rgba(124,108,248,0.2)", borderRadius: "14px 14px 4px 14px", padding: "9px 13px" }}>
                    <p style={{ fontSize: 13, color: "var(--text)", margin: 0, lineHeight: 1.5 }}>{msg.content}</p>
                  </div>
                  <p style={{ fontSize: 10, color: "var(--text-3)", margin: "3px 4px 0 0", textAlign: "right" }}>{msg.time}</p>
                </div>
              ) : (
                <div key={i} style={{ alignSelf: "flex-start", maxWidth: "90%" }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <div style={{ width: 26, height: 26, borderRadius: 8, background: "var(--accent-dim)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                      {BOT_ICON(12)}
                    </div>
                    <div>
                      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "4px 14px 14px 14px", padding: "9px 13px" }}>
                        <p style={{ fontSize: 13, color: "var(--text-2)", margin: 0, lineHeight: 1.65 }}>{msg.content}</p>
                      </div>
                      <p style={{ fontSize: 10, color: "var(--text-3)", margin: "3px 0 0 4px" }}>{msg.time}</p>
                    </div>
                  </div>
                </div>
              )
            ))}

            {chatLoading && (
              <div style={{ alignSelf: "flex-start", display: "flex", gap: 8, alignItems: "flex-start" }}>
                <div style={{ width: 26, height: 26, borderRadius: 8, background: "var(--accent-dim)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {BOT_ICON(12)}
                </div>
                <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "4px 14px 14px 14px", padding: "10px 14px" }}>
                  <p style={{ fontSize: 13, color: "var(--text-3)", margin: 0, fontStyle: "italic" }}>Pensando...</p>
                </div>
              </div>
            )}
            <div ref={msgsEndRef} />
          </div>

          {/* Quick action chips */}
          <div style={{ padding: "6px 18px 8px", flexShrink: 0, display: "flex", gap: 6, flexWrap: "wrap" }}>
            {QUICK_ACTIONS.map(({ label, icon }, i) => (
              <button
                key={i}
                onClick={() => sendMessage(label)}
                style={{ fontSize: 11, fontWeight: 500, color: "var(--text-2)", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: 99, padding: "5px 11px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 }}
              >
                <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
                {label}
              </button>
            ))}
          </div>

          {/* Input row */}
          <div style={{ padding: "6px 18px 10px", flexShrink: 0, display: "flex", gap: 8 }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe tu pregunta sobre esta clase..."
              style={{ flex: 1, background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-input)", color: "var(--text)", fontSize: 13, padding: "9px 13px", outline: "none" }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={chatLoading || !input.trim()}
              style={{
                background: "var(--accent)", color: "white", border: "none", borderRadius: "var(--radius-btn)",
                width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center",
                cursor: chatLoading || !input.trim() ? "default" : "pointer",
                opacity: chatLoading || !input.trim() ? 0.45 : 1, flexShrink: 0,
              }}
            >
              <RI s={14}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></RI>
            </button>
          </div>

          {/* Footer note */}
          <div style={{ padding: "0 18px 12px", flexShrink: 0 }}>
            <p style={{ fontSize: 10, color: "var(--text-3)", textAlign: "center", margin: 0 }}>
              La IA usa el contenido de la clase para responder con precisión.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
