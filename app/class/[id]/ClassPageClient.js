"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import MindMap from "@/components/MindMap";
import SummaryMarkdown from "@/components/SummaryMarkdown";
import ObsidianCanvas from "@/app/components/ObsidianCanvas";
import { createClient } from "@/lib/supabase/client";
import AppIcon from "@/components/Icon";
import StorageImage from "@/components/StorageImage";
import QuizCard from "@/components/QuizCard";

function RI({ s = 16, children }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
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

const QUICK_ACTIONS = [
  { label: "Explicado más simple", icon: <><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></> },
  { label: "Dame un ejemplo",       icon: <><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></> },
  { label: "Hazme un repaso",        icon: <><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></> },
];

const TYPE_BADGE = {
  whiteboard:  { fg: "#2DD4BF", label: "Pizarrón"    },
  slide:       { fg: "#60A5FA", label: "Diapositiva" },
  diagram:     { fg: "#A78BFA", label: "Diagrama"    },
  graph:       { fg: "#22C55E", label: "Gráfico"     },
  formula:     { fg: "#FBBF24", label: "Fórmula"     },
  table:       { fg: "#FB923C", label: "Tabla"       },
  screenshot:  { fg: "#818CF8", label: "Captura"     },
  photo:       { fg: "#F87171", label: "Foto"        },
  other:       { fg: "#9CA3AF", label: "Visual"      },
};

function buildVisualContext(notes) {
  if (!notes?.length) return "";
  return notes.map((note, i) => {
    const typeLabel = TYPE_BADGE[note.content_type]?.label || "Visual";
    let ctx = `[Imagen ${i + 1} — ${typeLabel}]`;
    if (note.description)    ctx += `\nDescripción: ${note.description}`;
    if (note.extracted_text) ctx += `\nTexto OCR visible: ${note.extracted_text}`;
    if (note.key_concepts?.length) ctx += `\nConceptos clave: ${note.key_concepts.join(", ")}`;
    if (note.gaps)           ctx += `\nInformación visual no mencionada verbalmente: ${note.gaps}`;
    return ctx;
  }).join("\n\n---\n\n");
}

export default function ClassPageClient({ cls }) {
  const { transcript, concepts = [], material_summary, final_summary, final_mindmap, canvas_nodes = [], visual_notes = [] } = cls.data ?? {};
  const duration = estimateDuration(transcript);

  const [quizQ, setQuizQ]         = useState(null);
  const [selected, setSelected]   = useState(null);
  const [quizLoading, setQuizLoading] = useState(false);

  const [messages, setMessages]   = useState([]);
  const [input, setInput]         = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const msgsEndRef = useRef(null);
  const mapContainerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [canvasNodes, setCanvasNodes] = useState(canvas_nodes);
  const [canvasLoading, setCanvasLoading] = useState(false);
  const [canvasError, setCanvasError] = useState(false);

  async function generateCanvas() {
    setCanvasLoading(true);
    setCanvasError(false);
    try {
      const res = await fetch("/api/generate-canvas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: transcript || "",
          material_summary: material_summary || "",
          concepts: concepts.map(c => (typeof c === "string" ? c : c.name || c)),
          chat_history: "",
        }),
      });
      if (!res.ok) throw new Error("Error generating canvas");
      const data = await res.json();
      if (data?.nodes?.length) {
        setCanvasNodes(data.nodes);
        const supabase = createClient();
        await supabase.from("classes").update({
          data: { ...cls.data, canvas_nodes: data.nodes },
        }).eq("id", cls.id);
      } else {
        setCanvasError(true);
      }
    } catch (err) {
      console.error("Canvas generation error:", err);
      setCanvasError(true);
    } finally {
      setCanvasLoading(false);
    }
  }

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

  const [quizScore, setQuizScore] = useState({ correct: 0, total: 0 });
  const [leftTab, setLeftTab] = useState("summary"); // "summary" | "transcript"

  const wordTotal = transcript ? transcript.trim().split(/\s+/).filter(Boolean).length : 0;
  // El transcript llega como texto corrido: lo partimos en párrafos de ~5 oraciones para que se lea mejor.
  const transcriptParagraphs = (() => {
    if (!transcript) return [];
    const byLines = transcript.split(/\n{2,}/).map(t => t.trim()).filter(Boolean);
    if (byLines.length > 1) return byLines;
    const sentences = transcript.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [transcript];
    const out = [];
    for (let i = 0; i < sentences.length; i += 5) out.push(sentences.slice(i, i + 5).join(" ").trim());
    return out;
  })();

  const createdLabel = new Date(cls.created_at).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });

  function answerQuiz(key) {
    if (selected || !quizQ) return;
    setSelected(key);
    setQuizScore(prev => ({ correct: prev.correct + (key === quizQ.correct ? 1 : 0), total: prev.total + 1 }));
  }

  function downloadTranscript() {
    const blob = new Blob([transcript || ""], { type: "text/plain;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = `${(cls.title || "clase").replace(/[\\/:*?"<>|]+/g, "").trim() || "clase"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
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
        body: JSON.stringify({ question: q, material_summary: material_summary || "", transcript: transcript || "", visual_context: buildVisualContext(visual_notes) }),
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
  const SPARKLE_SM = (
    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
    <div className="class-view" style={{ height: "100vh", display: "flex", flexDirection: "column", background: "var(--bg)", overflow: "hidden" }}>

      {/* ── TOP BAR ── */}
      <div className="class-topbar" style={{ height: 54, gap: 12, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 22px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <Link href="/dashboard" aria-label="Volver al dashboard" className="link-muted" style={{ textDecoration: "none", color: "var(--text-3)", display: "flex", alignItems: "center", padding: 4 }}>
            <RI s={15}><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></RI>
          </Link>
          <span title={cls.title} style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", letterSpacing: "-0.01em", maxWidth: 400, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {cls.title}
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(34,197,94,0.1)", color: "var(--green)", border: "1px solid rgba(34,197,94,0.2)", fontSize: 11, fontWeight: 600, borderRadius: 99, padding: "3px 10px", flexShrink: 0 }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#22C55E", display: "inline-block" }} />
            Guardada
          </span>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <Link href="/dashboard" style={{ textDecoration: "none" }}>
            <span className="btn-ghost" style={{ display: "inline-block", background: "transparent", color: "var(--text-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-btn)", padding: "7px 16px", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
              Dashboard
            </span>
          </Link>
          {transcript && (
              <button onClick={downloadTranscript} className="btn-accent" style={{ background: "var(--accent)", color: "white", border: "none", borderRadius: "var(--radius-btn)", padding: "7px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                <RI s={13}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></RI>
                Transcript
              </button>
          )}
        </div>
      </div>

      {/* ── 3 COLUMNS ── */}
      <div className="class-grid class-grid--auto">

        {/* ── LEFT: RESUMEN + QUIZ ── */}
        <div style={{ ...COL, borderRight: "1px solid var(--border)" }}>
          <div style={PANEL_HDR}>
            <div role="tablist" aria-label="Contenido de la clase" style={{ display: "flex", gap: 4, background: "var(--tint-2)", border: "1px solid var(--border)", borderRadius: 10, padding: 3 }}>
              {[["summary", "Resumen"], ["transcript", "Transcript"]].map(([key, label]) => {
                const active = leftTab === key;
                return (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setLeftTab(key)}
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, borderRadius: 8, padding: "5px 12px", cursor: "pointer", border: "none", background: active ? "var(--accent)" : "transparent", color: active ? "white" : "var(--text-2)" }}
                  >
                    {key === "summary" && SPARKLE_SM}
                    {label}
                  </button>
                );
              })}
            </div>
            {leftTab === "transcript" && wordTotal > 0 && (
              <span style={{ fontSize: 11, color: "var(--text-3)" }}>{wordTotal.toLocaleString("es-MX")} palabras</span>
            )}
          </div>

          {leftTab === "transcript" ? (
            <div style={{ flex: 1, overflowY: "auto", padding: "18px 22px 24px" }}>
              {transcript ? (
                transcriptParagraphs.map((para, i) => (
                  <p key={i} style={{ fontSize: 13.5, color: "var(--text-2)", lineHeight: 1.8, marginBottom: 14 }}>{para}</p>
                ))
              ) : (
                <p style={{ fontSize: 13, color: "var(--text-3)", textAlign: "center", marginTop: 40 }}>Esta clase no tiene transcript guardado.</p>
              )}
            </div>
          ) : (
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 22px 24px", display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Summary */}
            {final_summary && (
              <div style={{ fontSize: 14, color: "var(--text-2)", lineHeight: 1.75 }}>
                <SummaryMarkdown text={final_summary} />
              </div>
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
              {visual_notes.length > 0 && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "var(--card)", border: "1px solid var(--border)", color: "var(--text-2)", fontSize: 11, fontWeight: 500, borderRadius: 99, padding: "5px 12px" }}>
                  <RI s={11}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></RI>
                  {visual_notes.length} {visual_notes.length === 1 ? "imagen" : "imágenes"}
                </span>
              )}
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "var(--card)", border: "1px solid var(--border)", color: "var(--text-2)", fontSize: 11, fontWeight: 500, borderRadius: 99, padding: "5px 12px" }}>
                <RI s={11}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></RI>
                {createdLabel}
              </span>
            </div>

            {/* Quiz generator */}
            {concepts.length > 0 && (
              <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
                {/* Quiz header */}
                <div style={{ padding: "14px 18px 12px", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 7 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <RI s={14}><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6M9 12h6M9 15h4"/></RI>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>Practica esta clase</span>
                    </div>
                    {quizScore.total > 0 && (
                      <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-2)", background: "var(--tint-2)", borderRadius: 99, padding: "3px 10px" }}>
                        {quizScore.correct}/{quizScore.total} correctas
                      </span>
                    )}
                  </div>
                </div>

                {/* Quiz body */}
                <div style={{ padding: "14px 18px" }}>
                  {quizQ ? (
                    <div style={{ marginBottom: 14 }}>
                      <QuizCard key={quizQ.question} question={quizQ} compact onAnswer={(ok, key) => answerQuiz(key)} />
                    </div>
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
                    {quizLoading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : SPARKLE}
                    {quizLoading ? "Generando..." : quizQ ? "Siguiente pregunta" : "Generar pregunta"}
                  </button>
                </div>
              </div>
            )}
          </div>
          )}
        </div>

        {/* ── CENTER: MAPA MENTAL + MAPA DE CONOCIMIENTO ── */}
        <div style={{ ...COL, borderRight: "1px solid var(--border)" }}>
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px 22px", display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Mapa mental clásico */}
            <div ref={mapContainerRef} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, display: "flex", flexDirection: "column", height: isFullscreen ? "100%" : 320, flexShrink: 0, overflow: "hidden" }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 9, flexShrink: 0 }}>
                <div style={HDR_ICON}>
                  {SPARKLE}
                  <h2 style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", margin: 0 }}>Mapa mental</h2>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={toggleFullscreen} aria-label={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"} title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"} style={{ background: isFullscreen ? "var(--accent-dim)" : "var(--tint-2)", border: `1px solid ${isFullscreen ? "var(--accent)" : "var(--border)"}`, borderRadius: 8, padding: "5px 7px", color: isFullscreen ? "var(--accent)" : "var(--text-2)", cursor: "pointer", display: "flex", alignItems: "center" }}>
                    {isFullscreen
                      ? <RI s={13}><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></RI>
                      : <RI s={13}><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></RI>
                    }
                  </button>
                </div>
              </div>
              <div style={{ flex: 1, overflow: "hidden", padding: "12px", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
                {final_mindmap ? (
                  <MindMap markdown={final_mindmap} />
                ) : (
                  <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-3)", fontSize: 13 }}>
                    Sin mapa mental disponible
                  </div>
                )}
              </div>
            </div>

            {/* Mapa de conocimiento (Obsidian) */}
            {!isFullscreen && (
              <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", flexShrink: 0 }}>
                <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 9 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(124,108,248,0.1)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}><AppIcon name="network" size={15} /></div>
                    <div>
                      <h2 style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>Mapa de conocimiento</h2>
                      <p style={{ fontSize: 10, color: "var(--text-3)" }}>Explora los conceptos y sus relaciones de manera interactiva</p>
                    </div>
                  </div>
                  {canvasLoading && (
                    <span style={{ fontSize: 11, color: "var(--accent)", fontWeight: 600, flexShrink: 0 }}>Generando mapa...</span>
                  )}
                </div>
                <div style={{ padding: "12px 16px" }}>
                  {canvasLoading ? (
                    <div style={{ height: 200, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
                      <div className="animate-spin" style={{ width: 30, height: 30, border: "3px solid var(--border)", borderTopColor: "var(--accent)", borderRadius: "50%" }} />
                      <span style={{ fontSize: 12, color: "var(--text-3)" }}>El Asistente IA está extrayendo relaciones de la clase...</span>
                    </div>
                  ) : canvasNodes.length > 0 ? (
                    <ObsidianCanvas nodes={canvasNodes} />
                  ) : (
                    <div style={{ height: 200, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
                      <span style={{ fontSize: 13, color: "var(--text-3)", textAlign: "center", maxWidth: 260 }}>
                        {canvasError ? "No se pudo generar el mapa de conocimiento." : "Este mapa aún no se ha generado para esta clase."}
                      </span>
                      <button onClick={generateCanvas} style={{ background: "var(--accent)", border: "none", borderRadius: 8, padding: "7px 16px", color: "white", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                        {canvasError ? "Reintentar" : "Generar mapa de conocimiento"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {concepts.length > 0 && (
            <div style={{ padding: "10px 22px 14px", borderTop: "1px solid var(--border)", textAlign: "center", flexShrink: 0 }}>
              <span style={{ fontSize: 12, color: "var(--text-3)", fontWeight: 500 }}>{concepts.length} conceptos clave</span>
            </div>
          )}

          {/* Visual notes strip */}
          {visual_notes.length > 0 && (
            <div style={{ borderTop: "1px solid var(--border)", padding: "12px 22px 14px", flexShrink: 0 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-2)", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
                <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 0 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
                Notas visuales ({visual_notes.length})
              </p>
              <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
                {visual_notes.map((note, i) => {
                  const tb = TYPE_BADGE[note.content_type] || TYPE_BADGE.other;
                  return (
                    <div key={i} style={{ flexShrink: 0, width: 120, borderRadius: 8, border: "1px solid var(--border)", overflow: "hidden", background: "var(--tint-1)" }}>
                      <div style={{ position: "relative" }}>
                        <StorageImage
                          path={note.storagePath}
                          initialUrl={note.imageUrl}
                          alt={note.description || tb.label}
                          style={{ width: "100%", height: 70, objectFit: "cover", display: "block" }}
                          fallback={
                            <div style={{ height: 70, background: "var(--tint-2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-3)" }}>
                              <AppIcon name="image" size={18} />
                            </div>
                          }
                        />
                        <span style={{ position: "absolute", top: 3, left: 3, fontSize: 9, fontWeight: 700, color: tb.fg, background: "rgba(0,0,0,0.6)", borderRadius: 99, padding: "1px 5px" }}>{tb.label}</span>
                      </div>
                      <div style={{ padding: "5px 7px" }}>
                        <p style={{ fontSize: 9, color: "var(--text-2)", lineHeight: 1.4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{note.description}</p>
                        {note.gaps && <p style={{ fontSize: 9, color: "var(--yellow)", marginTop: 3, fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}><AppIcon name="alert" size={10} /> Gap visual</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: AGENTE DE ESTUDIO ── */}
        <div className="col-chat" style={COL}>
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
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 500, color: "var(--green)" }}>
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
                  <span className="typing-dots" aria-label="Pensando"><span /><span /><span /></span>
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
                disabled={chatLoading}
                className="chip-btn"
                style={{ fontSize: 11, fontWeight: 500, color: "var(--text-2)", background: "var(--tint-2)", border: "1px solid var(--border)", borderRadius: 99, padding: "5px 11px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 }}
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
              aria-label="Pregunta para el agente de estudio"
              className="input"
              style={{ flex: 1, background: "var(--card)", fontSize: 13, padding: "9px 13px" }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={chatLoading || !input.trim()}
              aria-label="Enviar pregunta"
              className="btn-accent"
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
