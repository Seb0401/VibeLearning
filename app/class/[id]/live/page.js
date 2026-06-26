"use client";
import { useRef, useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import MindMap from "@/components/MindMap";
import ReactMarkdown from "react-markdown";

const CHUNK_INTERVAL = 7000;
const WINDOW_CHUNKS = 13;
const CONCEPT_ICONS = ["📈", "Σ", "✕", "🛡", "⚡", "🔬", "💡", "🔗", "📊", "🎯"];

function formatTimer(s) {
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function nowHMS() {
  return new Date().toLocaleTimeString("es-MX", { hour12: false });
}

function HighlightedText({ text, conceptNames }) {
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

export default function LiveClass() {
  const { id: classId } = useParams();

  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [transcriptLines, setTranscriptLines] = useState([]);
  const [concepts, setConcepts] = useState([]);
  const [expandedConcept, setExpandedConcept] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [quizAnswer, setQuizAnswer] = useState(null);
  const [reinforcement, setReinforcement] = useState(null);
  const [materialSummary, setMaterialSummary] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [chatQuestion, setChatQuestion] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [finalData, setFinalData] = useState(null);

  const mediaRecorderRef = useRef(null);
  const chunkCountRef = useRef(0);
  const transcriptRef = useRef("");
  const conceptsRef = useRef([]);
  const timerRef = useRef(null);
  const transcriptEndRef = useRef(null);
  const chatEndRef = useRef(null);
  const isRecordingRef = useRef(false);
  const streamRef = useRef(null);
  const chunkTimerRef = useRef(null);

  useEffect(() => {
    if (recording) {
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [recording]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcriptLines]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, chatLoading]);

  function scheduleChunk() {
    if (!isRecordingRef.current) return;

    const chunks = [];
    const recorder = new MediaRecorder(streamRef.current, { mimeType: "audio/webm" });
    mediaRecorderRef.current = recorder;

    recorder.addEventListener("dataavailable", (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    });

    recorder.addEventListener("stop", async () => {
      if (chunks.length > 0) {
        chunkCountRef.current += 1;
        const blob = new Blob(chunks, { type: "audio/webm" });
        const formData = new FormData();
        formData.append("audio", blob, "chunk.webm");
        try {
          const res = await fetch("/api/transcribe", { method: "POST", body: formData });
          const json = await res.json();
          if (!json.skip && json.text) {
            const line = { time: nowHMS(), text: json.text.trim() };
            setTranscriptLines((prev) => {
              const next = [...prev, line];
              transcriptRef.current = next.map((l) => l.text).join(" ");
              return next;
            });
            if (chunkCountRef.current % WINDOW_CHUNKS === 0) {
              fetchConcepts(transcriptRef.current);
            }
          }
        } catch {}
      }
      scheduleChunk();
    });

    recorder.start();
    chunkTimerRef.current = setTimeout(() => {
      if (recorder.state === "recording") recorder.stop();
    }, CHUNK_INTERVAL);
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      isRecordingRef.current = true;
      setRecording(true);
      scheduleChunk();
    } catch (err) {
      alert("No se pudo acceder al micrófono: " + err.message);
    }
  }

  function stopRecording() {
    isRecordingRef.current = false;
    clearTimeout(chunkTimerRef.current);
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setRecording(false);
  }

  async function fetchConcepts(currentTranscript) {
    try {
      const res = await fetch("/api/concepts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: currentTranscript }),
      });
      const json = await res.json();
      if (json.skip || !json.concepts?.length) return;
      setConcepts((prev) => {
        const next = [...prev, ...json.concepts];
        conceptsRef.current = next;
        return next;
      });
      fetchQuiz(json.concepts);
    } catch {}
  }

  async function fetchQuiz(conceptsToQuiz) {
    try {
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ concepts: conceptsToQuiz }),
      });
      const json = await res.json();
      if (json.skip || !json.question) return;
      setQuiz(json);
      setQuizAnswer(null);
      setReinforcement(null);
    } catch {}
  }

  async function answerQuiz(option) {
    if (!quiz || quizAnswer !== null) return;
    setQuizAnswer(option);
    if (option !== quiz.correct) {
      try {
        const res = await fetch("/api/reinforcement", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ concept_name: quiz.concept, concept_summary: quiz.question }),
        });
        const json = await res.json();
        if (!json.skip && json.markdown) setReinforcement(json.markdown);
      } catch {}
    }
  }

  async function uploadPDF(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("pdf", file);
    try {
      const res = await fetch("/api/upload-material", { method: "POST", body: formData });
      const json = await res.json();
      if (!json.skip && json.summary) setMaterialSummary(json.summary);
    } catch {}
  }

  async function sendChatText(text) {
    if (!text?.trim() || chatLoading) return;
    const q = text.trim();
    setChatHistory((prev) => [...prev, { role: "user", text: q }]);
    setChatQuestion("");
    setChatLoading(true);
    try {
      const res = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: q,
          material_summary: materialSummary,
          transcript: transcriptRef.current,
        }),
      });
      const json = await res.json();
      setChatHistory((prev) => [...prev, { role: "ai", text: json.answer || "No se pudo responder." }]);
    } catch {
      setChatHistory((prev) => [...prev, { role: "ai", text: "Error al conectar." }]);
    } finally {
      setChatLoading(false);
    }
  }

  function handleChatSubmit(e) {
    e.preventDefault();
    sendChatText(chatQuestion);
  }

  async function finishClass() {
    if (finishing) return;
    setFinishing(true);
    try {
      const res = await fetch("/api/finish-class", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: transcriptRef.current, concepts: conceptsRef.current }),
      });
      const json = await res.json();
      if (json.skip) { setFinishing(false); return; }
      setFinalData(json);
      const supabase = createClient();
      await supabase.from("classes").update({
        title: json.title || "Clase sin título",
        data: {
          transcript: transcriptRef.current,
          concepts: conceptsRef.current,
          material_summary: materialSummary,
          final_summary: json.final_summary,
          final_mindmap: json.final_mindmap,
        },
      }).eq("id", classId);
    } catch {
      setFinishing(false);
    }
  }

  const conceptNames = concepts.map((c) => c.name);
  const progressPct = Math.min(100, Math.round((concepts.length / 16) * 100));

  // ─── POST-CLASS VIEW ───────────────────────────────────────────────────────
  if (finalData) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "2rem" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 700, marginBottom: "1.5rem" }}>{finalData.title}</h1>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "1.5rem", marginBottom: "1.5rem" }}>
            <h2 style={{ fontWeight: 600, marginBottom: "1rem", color: "var(--accent)" }}>Resumen high-yield</h2>
            <div style={{ lineHeight: 1.7 }}>
              <ReactMarkdown>{finalData.final_summary}</ReactMarkdown>
            </div>
          </div>
          {finalData.final_mindmap && (
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "1.5rem", marginBottom: "1.5rem" }}>
              <h2 style={{ fontWeight: 600, marginBottom: "1rem", color: "var(--accent)" }}>Mapa mental</h2>
              <MindMap markdown={finalData.final_mindmap} />
            </div>
          )}
          <button
            onClick={() => (window.location.href = "/dashboard")}
            style={{ background: "var(--accent)", border: "none", borderRadius: 8, padding: "0.6rem 1.5rem", color: "white", fontWeight: 600, cursor: "pointer", fontSize: "0.9rem" }}
          >
            Ir al dashboard
          </button>
        </div>
      </div>
    );
  }

  // ─── LIVE CLASS VIEW ───────────────────────────────────────────────────────
  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "var(--bg)", color: "var(--text)", overflow: "hidden" }}>

      {/* ── HEADER ── */}
      <header style={{ height: 56, flexShrink: 0, background: "#11111f", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", padding: "0 1.5rem", gap: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,#7c6df2,#a78bfa)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🧠</div>
          <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>Aula AI</span>
        </div>

        <div style={{ width: 1, height: 20, background: "var(--border)", flexShrink: 0 }} />

        <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
          <span style={{ fontSize: 15 }}>📘</span>
          <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>Clase en vivo</span>
        </div>

        {recording && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", display: "inline-block", animation: "pulse 1.5s infinite" }} />
            <span style={{ color: "#22c55e", fontSize: "0.82rem", fontWeight: 600 }}>Grabando</span>
            <span style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>{formatTimer(elapsed)}</span>
          </div>
        )}

        {materialSummary && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--text-muted)", fontSize: "0.82rem" }}>
            <span>📄</span><span>PDF cargado</span>
          </div>
        )}

        <label style={{ cursor: "pointer" }}>
          <input type="file" accept=".pdf" onChange={uploadPDF} style={{ display: "none" }} />
          <span style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "5px 12px", fontSize: "0.8rem", color: "var(--text)", cursor: "pointer", userSelect: "none" }}>
            {materialSummary ? "✓ PDF" : "+ PDF"}
          </span>
        </label>

        <button
          onClick={recording ? stopRecording : startRecording}
          style={{ background: recording ? "rgba(239,68,68,0.12)" : "rgba(124,109,242,0.12)", border: `1px solid ${recording ? "#ef4444" : "var(--accent)"}`, borderRadius: 8, padding: "5px 14px", color: recording ? "#ef4444" : "var(--accent)", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer" }}
        >
          {recording ? "■ Detener" : "● Iniciar"}
        </button>

        <button
          onClick={finishClass}
          disabled={finishing}
          style={{ background: "var(--accent)", border: "none", borderRadius: 8, padding: "6px 16px", color: "white", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", opacity: finishing ? 0.7 : 1 }}
        >
          {finishing ? "Guardando..." : "Finalizar clase"}
        </button>
      </header>

      {/* ── BODY ── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* Sidebar */}
        <aside style={{ width: 56, flexShrink: 0, background: "#11111f", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", alignItems: "center", padding: "12px 0", gap: 6 }}>
          {[{ icon: "🎙", active: true }, { icon: "📖", active: false }, { icon: "✨", active: false }, { icon: "📊", active: false }].map(({ icon, active }, i) => (
            <button key={i} style={{ width: 36, height: 36, borderRadius: 8, border: "none", background: active ? "rgba(124,109,242,0.2)" : "transparent", color: active ? "var(--accent)" : "var(--text-muted)", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {icon}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <button style={{ width: 36, height: 36, borderRadius: 8, border: "none", background: "transparent", fontSize: 16, cursor: "pointer", color: "var(--text-muted)" }}>⚙️</button>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: "0.8rem" }}>A</div>
        </aside>

        {/* 3-column grid */}
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", overflow: "hidden" }}>

          {/* ── COL 1: CONCEPTOS ── */}
          <div style={{ borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
              <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>Conceptos clave</span>
              <button style={{ width: 24, height: 24, borderRadius: 6, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)", cursor: "pointer", fontSize: "0.95rem", lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "12px" }}>
              {concepts.length === 0 && (
                <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center", marginTop: "2.5rem", lineHeight: 1.6 }}>
                  Los conceptos aparecerán cuando<br />inicies la clase
                </p>
              )}
              {concepts.map((c, i) => {
                const isExpanded = expandedConcept === i;
                return (
                  <div
                    key={i}
                    onClick={() => setExpandedConcept(isExpanded ? null : i)}
                    style={{ borderRadius: 10, border: `1px solid ${isExpanded ? "var(--accent)" : "var(--border)"}`, background: isExpanded ? "rgba(124,109,242,0.08)" : "var(--surface)", padding: "10px 12px", marginBottom: 8, cursor: "pointer", transition: "border-color 0.15s" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: "1rem", opacity: 0.8, flexShrink: 0 }}>{CONCEPT_ICONS[i % CONCEPT_ICONS.length]}</span>
                      <span style={{ flex: 1, fontWeight: 600, fontSize: "0.87rem", color: isExpanded ? "var(--accent)" : "var(--text)" }}>{c.name}</span>
                      {isExpanded
                        ? <span style={{ color: "var(--accent)", fontSize: "0.7rem" }}>▲</span>
                        : <span style={{ color: "#22c55e", fontSize: "0.95rem" }}>✓</span>}
                    </div>
                    {isExpanded && (
                      <div style={{ marginTop: 8 }}>
                        <p style={{ color: "var(--text-muted)", fontSize: "0.81rem", lineHeight: 1.55, marginBottom: 8 }}>{c.summary}</p>
                        <button
                          onClick={(e) => { e.stopPropagation(); sendChatText(`Dame un ejemplo de ${c.name}`); }}
                          style={{ background: "none", border: "1px solid var(--border)", borderRadius: 6, padding: "3px 8px", color: "var(--text-muted)", fontSize: "0.74rem", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                        >
                          🔍 Ver ejemplo
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Progress */}
            <div style={{ padding: "14px 16px", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: "0.8rem", fontWeight: 600 }}>Progreso de la clase</span>
                <span style={{ fontSize: "0.8rem", color: "var(--accent)", fontWeight: 700 }}>{progressPct}%</span>
              </div>
              <div style={{ height: 5, background: "var(--border)", borderRadius: 10, overflow: "hidden" }}>
                <div style={{ height: "100%", background: "var(--accent)", width: `${progressPct}%`, borderRadius: 10, transition: "width 0.5s" }} />
              </div>
              <p style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginTop: 5 }}>{concepts.length} de 16 conceptos cubiertos</p>
            </div>
          </div>

          {/* ── COL 2: TRANSCRIPT ── */}
          <div style={{ borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
              <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>Transcript en vivo</span>
              {recording && (
                <div style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--text-muted)", fontSize: "0.78rem" }}>
                  <span style={{ letterSpacing: 1 }}>〰</span>
                  <span>Escuchando...</span>
                </div>
              )}
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px" }}>
              {transcriptLines.length === 0 && (
                <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center", marginTop: "2.5rem", lineHeight: 1.6 }}>
                  La transcripción aparecerá aquí<br />cuando inicies la clase
                </p>
              )}
              {transcriptLines.map((line, i) => (
                <div key={i} style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                  <div style={{ flexShrink: 0, paddingTop: 6 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)" }} />
                  </div>
                  <div>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.74rem", display: "block", marginBottom: 3 }}>{line.time}</span>
                    <span style={{ fontSize: "0.875rem", lineHeight: 1.65 }}>
                      <HighlightedText text={line.text} conceptNames={conceptNames} />
                    </span>
                  </div>
                </div>
              ))}
              <div ref={transcriptEndRef} />
            </div>

            {/* Quiz */}
            {quiz && (
              <div style={{ borderTop: "1px solid var(--border)", padding: "14px 16px", flexShrink: 0, background: "rgba(124,109,242,0.03)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: "0.85rem" }}>⚡ Pregunta rápida</span>
                  <span style={{ background: "rgba(124,109,242,0.15)", color: "var(--accent)", fontSize: "0.72rem", borderRadius: 20, padding: "2px 9px", fontWeight: 600 }}>☆ 1 punto</span>
                </div>
                <p style={{ fontSize: "0.85rem", marginBottom: 10, color: "var(--text)", fontWeight: 500 }}>{quiz.question}</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                  {["A", "B", "C", "D"].map((opt) => {
                    if (!quiz.options?.[opt]) return null;
                    const isSelected = quizAnswer === opt;
                    const isCorrect = quiz.correct === opt;
                    let bg = "var(--surface)";
                    let borderColor = "var(--border)";
                    let textColor = "var(--text)";
                    if (quizAnswer !== null) {
                      if (isCorrect) { bg = "rgba(34,197,94,0.08)"; borderColor = "#22c55e"; textColor = "#22c55e"; }
                      else if (isSelected) { bg = "rgba(239,68,68,0.08)"; borderColor = "#ef4444"; textColor = "#ef4444"; }
                    } else if (isSelected) {
                      bg = "rgba(124,109,242,0.15)"; borderColor = "var(--accent)"; textColor = "var(--accent)";
                    }
                    return (
                      <button
                        key={opt}
                        onClick={() => answerQuiz(opt)}
                        disabled={quizAnswer !== null}
                        style={{ background: bg, border: `1px solid ${borderColor}`, borderRadius: 8, padding: "7px 10px", textAlign: "left", cursor: quizAnswer !== null ? "default" : "pointer", display: "flex", alignItems: "center", gap: 7 }}
                      >
                        <span style={{ width: 14, height: 14, borderRadius: "50%", border: `2px solid ${borderColor}`, background: isSelected || (quizAnswer !== null && isCorrect) ? borderColor : "transparent", flexShrink: 0, display: "inline-block" }} />
                        <span style={{ fontSize: "0.77rem", color: textColor }}><strong>{opt}.</strong> {quiz.options[opt]}</span>
                      </button>
                    );
                  })}
                </div>
                {quizAnswer !== null && (
                  <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.8rem", fontWeight: 600, color: quizAnswer === quiz.correct ? "#22c55e" : "#ef4444" }}>
                      {quizAnswer === quiz.correct ? "✓ Correcto" : `✗ Incorrecto — Respuesta: ${quiz.correct}`}
                    </span>
                    <button onClick={() => { setQuiz(null); setQuizAnswer(null); setReinforcement(null); }} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "0.77rem" }}>Cerrar</button>
                  </div>
                )}
                {reinforcement && (
                  <div style={{ marginTop: 10, background: "rgba(124,109,242,0.05)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px" }}>
                    <p style={{ fontSize: "0.78rem", fontWeight: 700, marginBottom: 6, color: "var(--accent)" }}>Refuerzo</p>
                    <div style={{ fontSize: "0.81rem", lineHeight: 1.5 }}>
                      <ReactMarkdown>{reinforcement}</ReactMarkdown>
                    </div>
                    <MindMap markdown={reinforcement} />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── COL 3: CHATBOT ── */}
          <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ fontSize: 15 }}>✨</span>
                <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>Chatbot RAG</span>
              </div>
              <span style={{ color: "var(--text-muted)", cursor: "pointer", fontSize: "1.1rem", letterSpacing: 2 }}>···</span>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px 0" }}>
              {chatHistory.length === 0 && (
                <div style={{ textAlign: "center", marginTop: "4rem" }}>
                  <div style={{ fontSize: "2.5rem", marginBottom: 10 }}>✨</div>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", lineHeight: 1.6 }}>Hazme una pregunta sobre la clase<br />y te responderé con el contexto del material</p>
                </div>
              )}
              {chatHistory.map((msg, i) => (
                <div key={i} style={{ marginBottom: 14, display: "flex", flexDirection: msg.role === "user" ? "row-reverse" : "row", gap: 8, alignItems: "flex-start" }}>
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: msg.role === "user" ? "var(--accent)" : "linear-gradient(135deg,#7c6df2,#a78bfa)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "white", fontWeight: 700, fontSize: msg.role === "user" ? "0.75rem" : "0.9rem" }}>
                    {msg.role === "user" ? "A" : "🧠"}
                  </div>
                  <div style={{ maxWidth: "76%", background: msg.role === "user" ? "var(--accent)" : "var(--surface)", border: msg.role === "ai" ? "1px solid var(--border)" : "none", borderRadius: msg.role === "user" ? "12px 4px 12px 12px" : "4px 12px 12px 12px", padding: "9px 12px", fontSize: "0.83rem", lineHeight: 1.55, color: msg.role === "user" ? "white" : "var(--text)" }}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 14 }}>
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg,#7c6df2,#a78bfa)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "0.9rem" }}>🧠</div>
                  <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "4px 12px 12px 12px", padding: "9px 14px", color: "var(--text-muted)", fontSize: "0.83rem", letterSpacing: 3 }}>···</div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Follow-up suggestions */}
            {chatHistory.length > 0 && !chatLoading && (
              <div style={{ padding: "10px 14px", flexShrink: 0 }}>
                <p style={{ fontSize: "0.71rem", color: "var(--text-muted)", marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Sugerencias de seguimiento</p>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {[
                    { icon: "🧩", text: "Explícalo más simple" },
                    { icon: "💡", text: "Dame un ejemplo" },
                    { icon: "🎯", text: "Genera otra pregunta" },
                  ].map(({ icon, text }) => (
                    <button
                      key={text}
                      onClick={() => sendChatText(text)}
                      style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 20, padding: "4px 10px", fontSize: "0.74rem", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                    >
                      {icon} {text}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div style={{ padding: "10px 14px 14px", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
              <form onSubmit={handleChatSubmit} style={{ display: "flex", gap: 8 }}>
                <input
                  value={chatQuestion}
                  onChange={(e) => setChatQuestion(e.target.value)}
                  placeholder="Escribe tu pregunta..."
                  style={{ flex: 1, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "8px 12px", color: "var(--text)", fontSize: "0.83rem", outline: "none" }}
                />
                <button
                  type="submit"
                  disabled={chatLoading || !chatQuestion.trim()}
                  style={{ width: 36, height: 36, borderRadius: 10, background: "var(--accent)", border: "none", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem", opacity: chatLoading || !chatQuestion.trim() ? 0.45 : 1, flexShrink: 0 }}
                >
                  ▶
                </button>
              </form>
              <p style={{ fontSize: "0.67rem", color: "var(--text-muted)", marginTop: 7, textAlign: "center" }}>
                Aula AI puede cometer errores. Verifica la información importante.
              </p>
            </div>
          </div>

        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
