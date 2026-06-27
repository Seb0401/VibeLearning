"use client";
import { useRef, useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Mic, MicOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import MindMap from "@/components/MindMap";
import ReactMarkdown from "react-markdown";

const CHUNK_INTERVAL = 7000;
const WINDOW_CHUNKS = 13;
const QUIZ_INTERVAL = 60_000;   // nueva pregunta cada 60s
const QUIZ_TIMEOUT = 30_000;    // auto-cierre si no responde
const QUIZ_RESULT_DELAY = 4000; // muestra resultado 4s antes de cerrar
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

/* ── Post-class report helpers ────────────────────────────────────────── */
function RI({ s = 16, children }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

function VibeLearningLogo() {
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

function LiveMicButton({ recording, onToggle }) {
  const Icon = recording ? MicOff : Mic;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 9 }}>
      <div style={{ position: "relative", width: 108, height: 108, display: "grid", placeItems: "center" }}>
        {recording && (
          <>
            <span className="mic-ring mic-ring-one" />
            <span className="mic-ring mic-ring-two" />
            <span className="mic-orbit" />
          </>
        )}
        <button
          type="button"
          className={`live-mic-button ${recording ? "is-recording" : ""}`}
          onClick={onToggle}
          aria-label={recording ? "Detener grabacion" : "Iniciar grabacion"}
          title={recording ? "Detener grabacion" : "Iniciar grabacion"}
        >
          <Icon size={36} strokeWidth={2.15} />
        </button>
      </div>
      <div style={{ height: 20, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
        {recording ? (
          <>
            {[0, 1, 2, 3, 4].map((bar) => (
              <span key={bar} className="mic-level" style={{ animationDelay: `${bar * 90}ms` }} />
            ))}
          </>
        ) : (
          <span style={{ width: 34, height: 4, borderRadius: 99, background: "rgba(255,255,255,0.11)" }} />
        )}
      </div>
      <span style={{ color: recording ? "#f87171" : "var(--text-2)", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
        {recording ? "Detener" : "Iniciar"}
      </span>
    </div>
  );
}

export default function LiveClass() {
  const { id: classId } = useParams();

  const [recording, setRecording] = useState(false);
  const [audioSource, setAudioSource] = useState("mic"); // "mic" | "system" | "both"
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
  const [reportChatHistory, setReportChatHistory] = useState([]);
  const [reportChatInput, setReportChatInput] = useState("");
  const [reportChatLoading, setReportChatLoading] = useState(false);

  // Gamification
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [quizStats, setQuizStats] = useState({ total: 0, correct: 0 });
  const [scoreFlash, setScoreFlash] = useState(null);
  const [quizCountdown, setQuizCountdown] = useState(null); // segundos restantes para auto-cierre

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
  const reportChatEndRef = useRef(null);
  const micStreamRef = useRef(null);
  const displayStreamRef = useRef(null);
  const audioCtxRef = useRef(null);

  // Quiz refs
  const quizIntervalRef = useRef(null);
  const quizAutoCloseRef = useRef(null);
  const quizCountdownRef = useRef(null);
  const quizActiveRef = useRef(false);
  const quizConceptIdxRef = useRef(0);
  const streakRef = useRef(0);
  const maxStreakRef = useRef(0);

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

  useEffect(() => {
    reportChatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [reportChatHistory, reportChatLoading]);

  // Sync streak ref with state
  useEffect(() => {
    streakRef.current = streak;
    if (streak > maxStreakRef.current) maxStreakRef.current = streak;
  }, [streak]);

  function getStreakMultiplier(s) {
    if (s >= 5) return 3;
    if (s >= 3) return 2;
    return 1;
  }

  function closeQuiz() {
    clearTimeout(quizAutoCloseRef.current);
    clearInterval(quizCountdownRef.current);
    setQuiz(null);
    setQuizAnswer(null);
    setReinforcement(null);
    setQuizCountdown(null);
    quizActiveRef.current = false;
  }

  function startQuizAutoClose(seconds, onClose) {
    clearTimeout(quizAutoCloseRef.current);
    clearInterval(quizCountdownRef.current);
    setQuizCountdown(seconds);
    let remaining = seconds;
    quizCountdownRef.current = setInterval(() => {
      remaining -= 1;
      setQuizCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(quizCountdownRef.current);
      }
    }, 1000);
    quizAutoCloseRef.current = setTimeout(() => {
      clearInterval(quizCountdownRef.current);
      setQuizCountdown(null);
      onClose();
    }, seconds * 1000);
  }

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
      let finalStream;

      if (audioSource === "mic") {
        finalStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = finalStream;

      } else if (audioSource === "system") {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: { suppressLocalAudioPlayback: false, echoCancellation: false, noiseSuppression: false },
        });
        displayStream.getVideoTracks().forEach((t) => t.stop());
        const audioTracks = displayStream.getAudioTracks();
        if (!audioTracks.length) {
          displayStream.getTracks().forEach((t) => t.stop());
          alert("No se capturó audio. Al compartir, selecciona una pestaña y activa 'Compartir audio de la pestaña'.");
          return;
        }
        displayStreamRef.current = displayStream;
        finalStream = new MediaStream(audioTracks);
        streamRef.current = finalStream;

      } else {
        // "both" — micrófono + audio del sistema, mezclados
        const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        let displayStream;
        try {
          displayStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: { suppressLocalAudioPlayback: false, echoCancellation: false, noiseSuppression: false },
          });
          displayStream.getVideoTracks().forEach((t) => t.stop());
        } catch {
          // Usuario canceló la pantalla — grabamos solo micrófono
          streamRef.current = micStream;
          micStreamRef.current = micStream;
          finalStream = micStream;
        }

        if (displayStream) {
          const sysAudio = displayStream.getAudioTracks();
          if (!sysAudio.length) {
            // Sin audio de sistema — solo micrófono
            displayStream.getTracks().forEach((t) => t.stop());
            finalStream = micStream;
            streamRef.current = finalStream;
            micStreamRef.current = micStream;
          } else {
            // Mezclar ambas fuentes con AudioContext
            const ctx = new AudioContext();
            const dest = ctx.createMediaStreamDestination();
            ctx.createMediaStreamSource(micStream).connect(dest);
            ctx.createMediaStreamSource(new MediaStream(sysAudio)).connect(dest);
            finalStream = dest.stream;
            streamRef.current = finalStream;
            micStreamRef.current = micStream;
            displayStreamRef.current = displayStream;
            audioCtxRef.current = ctx;
          }
        }
      }

      isRecordingRef.current = true;
      setRecording(true);
      scheduleChunk();

      quizIntervalRef.current = setInterval(() => {
        if (conceptsRef.current.length > 0 && !quizActiveRef.current) {
          const idx = quizConceptIdxRef.current % conceptsRef.current.length;
          quizConceptIdxRef.current += 1;
          triggerQuiz([conceptsRef.current[idx]]);
        }
      }, QUIZ_INTERVAL);
    } catch (err) {
      alert("No se pudo acceder al audio: " + err.message);
    }
  }

  function stopRecording() {
    isRecordingRef.current = false;
    clearTimeout(chunkTimerRef.current);
    clearInterval(quizIntervalRef.current);
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    displayStreamRef.current?.getTracks().forEach((t) => t.stop());
    audioCtxRef.current?.close();
    micStreamRef.current = null;
    displayStreamRef.current = null;
    audioCtxRef.current = null;
    setRecording(false);
  }

  async function fetchConcepts(currentTranscript) {
    try {
      const res = await fetch("/api/concepts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: currentTranscript,
          existing_concepts: conceptsRef.current.map((c) => c.name),
        }),
      });
      const json = await res.json();
      if (json.skip || !json.concepts?.length) return;

      setConcepts((prev) => {
        const existingNames = new Set(prev.map((c) => c.name.toLowerCase()));
        const newOnes = json.concepts.filter(
          (c) => !existingNames.has(c.name.toLowerCase())
        );
        if (!newOnes.length) return prev;
        const next = [...prev, ...newOnes];
        conceptsRef.current = next;
        return next;
      });
    } catch {}
  }

  async function triggerQuiz(conceptsToQuiz) {
    if (quizActiveRef.current) return;
    quizActiveRef.current = true;
    try {
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ concepts: conceptsToQuiz }),
      });
      const json = await res.json();
      if (json.skip || !json.question) {
        quizActiveRef.current = false;
        return;
      }
      setQuiz(json);
      setQuizAnswer(null);
      setReinforcement(null);
      // Auto-close sin respuesta tras 30s
      startQuizAutoClose(30, () => {
        quizActiveRef.current = false;
        setQuiz(null);
        setQuizAnswer(null);
        setReinforcement(null);
        setQuizCountdown(null);
      });
    } catch {
      quizActiveRef.current = false;
    }
  }

  async function answerQuiz(option) {
    if (!quiz || quizAnswer !== null) return;
    clearTimeout(quizAutoCloseRef.current);
    clearInterval(quizCountdownRef.current);
    setQuizCountdown(null);

    setQuizAnswer(option);
    const isCorrect = option === quiz.correct;
    setQuizStats((s) => ({ total: s.total + 1, correct: s.correct + (isCorrect ? 1 : 0) }));

    if (isCorrect) {
      const newStreak = streakRef.current + 1;
      const multiplier = getStreakMultiplier(newStreak);
      const pts = 10 * multiplier;
      setStreak(newStreak);
      setScore((s) => s + pts);
      const flashMsg = multiplier > 1
        ? `+${pts} pts 🔥×${multiplier}`
        : `+${pts} pts`;
      setScoreFlash(flashMsg);
      setTimeout(() => setScoreFlash(null), 2000);
    } else {
      setStreak(0);
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

    // Auto-cierre del resultado tras 4s (más si hay refuerzo)
    quizAutoCloseRef.current = setTimeout(() => {
      closeQuiz();
    }, QUIZ_RESULT_DELAY);
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
      setFinalData({
        ...json,
        score,
        quizStats,
        maxStreak: maxStreakRef.current,
      });
      const supabase = createClient();
      await supabase.from("classes").update({
        title: json.title || "Clase sin título",
        data: {
          transcript: transcriptRef.current,
          concepts: conceptsRef.current,
          material_summary: materialSummary,
          final_summary: json.final_summary,
          final_mindmap: json.final_mindmap,
          score,
          quiz_stats: quizStats,
        },
      }).eq("id", classId);
    } catch {
      setFinishing(false);
    }
  }

  const conceptNames = concepts.map((c) => c.name);
  const progressPct = Math.min(100, Math.round((concepts.length / 16) * 100));
  const streakMultiplier = getStreakMultiplier(streak);
  const accuracy = quizStats.total > 0
    ? Math.round((quizStats.correct / quizStats.total) * 100)
    : null;

  function downloadTranscript() {
    if (!transcriptLines.length) return;
    const text = transcriptLines.map(l => `[${l.time}] ${l.text}`).join("\n\n");
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transcript-${(finalData?.title || "clase").replace(/\s+/g, "-")}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function sendReportChat(e) {
    e?.preventDefault();
    const q = reportChatInput.trim();
    if (!q || reportChatLoading) return;
    setReportChatHistory(prev => [...prev, { role: "user", text: q }]);
    setReportChatInput("");
    setReportChatLoading(true);
    try {
      const res = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: q,
          material_summary: finalData?.final_summary || "",
          transcript: transcriptRef.current,
        }),
      });
      const json = await res.json();
      setReportChatHistory(prev => [...prev, { role: "ai", text: json.answer || "No pude responder." }]);
    } catch {
      setReportChatHistory(prev => [...prev, { role: "ai", text: "Error al conectar." }]);
    } finally {
      setReportChatLoading(false);
    }
  }

  // ─── POST-CLASS REPORT ────────────────────────────────────────────────────
  if (finalData) {
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
      <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "var(--bg)", overflow: "hidden" }}>

        {/* ── HEADER ── */}
        <header style={{ height: 56, flexShrink: 0, background: "#11111f", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", padding: "0 1.25rem", gap: "1rem" }}>
          <VibeLearningLogo />
          <div style={{ width: 1, height: 20, background: "var(--border)", flexShrink: 0 }} />
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(34,197,94,0.1)", color: "#22C55E", border: "1px solid rgba(34,197,94,0.2)", fontSize: 11, fontWeight: 600, borderRadius: 99, padding: "3px 10px", flexShrink: 0 }}>
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
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

          {/* MAIN REPORT AREA */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

            {/* Metrics row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, padding: "14px 16px", flexShrink: 0, borderBottom: "1px solid var(--border)" }}>
              {[
                { icon: <RI s={15}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></RI>, bg: "rgba(124,108,248,0.12)", fg: "var(--accent)", label: "Conceptos", val: concepts.length || 0 },
                { icon: <RI s={15}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></RI>, bg: "rgba(96,165,250,0.12)", fg: "#60A5FA", label: "Duración", val: durationFmt || "—" },
                { icon: <RI s={15}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></RI>, bg: "rgba(251,191,36,0.12)", fg: "#FBBF24", label: "Puntos", val: finalData.score ?? 0 },
                { icon: <RI s={15}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></RI>, bg: finalAccuracy !== null ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.04)", fg: finalAccuracy !== null ? "#22C55E" : "var(--text-3)", label: "Precisión", val: finalAccuracy !== null ? `${finalAccuracy}%` : "—" },
                { icon: <RI s={15}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></RI>, bg: materialSummary ? "rgba(251,191,36,0.12)" : "rgba(255,255,255,0.04)", fg: materialSummary ? "var(--yellow)" : "var(--text-3)", label: "Material", val: materialSummary ? "PDF ✓" : "Sin PDF" },
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
            <div style={{ flex: 1, display: "flex", overflow: "hidden", padding: "14px 16px", gap: 12 }}>

              {/* AI Summary */}
              {finalData.final_summary && (
                <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, display: "flex", flexDirection: "column", flex: 1, minWidth: 0, minHeight: 0, overflow: "hidden" }}>
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
                    <ReactMarkdown
                      components={{
                        h1: ({children}) => <h1 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", margin: "14px 0 7px" }}>{children}</h1>,
                        h2: ({children}) => <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", margin: "11px 0 5px" }}>{children}</h2>,
                        h3: ({children}) => <h3 style={{ fontSize: 13, fontWeight: 600, color: "var(--text-2)", margin: "9px 0 4px" }}>{children}</h3>,
                        p:  ({children}) => <p style={{ margin: "0 0 9px", lineHeight: 1.7 }}>{children}</p>,
                        strong: ({children}) => <strong style={{ color: "var(--text)", fontWeight: 600 }}>{children}</strong>,
                        ul: ({children}) => <ul style={{ paddingLeft: 18, margin: "0 0 9px" }}>{children}</ul>,
                        ol: ({children}) => <ol style={{ paddingLeft: 18, margin: "0 0 9px" }}>{children}</ol>,
                        li: ({children}) => <li style={{ marginBottom: 4 }}>{children}</li>,
                        code: ({children}) => <code style={{ background: "rgba(124,108,248,0.1)", color: "var(--accent)", borderRadius: 4, padding: "1px 5px", fontSize: "0.87em" }}>{children}</code>,
                      }}
                    >
                      {finalData.final_summary}
                    </ReactMarkdown>
                  </div>
                </div>
              )}

              {/* MindMap */}
              {finalData.final_mindmap && (
                <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, display: "flex", flexDirection: "column", flex: 1, minWidth: 0, minHeight: 0, overflow: "hidden" }}>
                  <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 9, flexShrink: 0 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(96,165,250,0.1)", color: "#60A5FA", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <RI s={14}><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></RI>
                    </div>
                    <div>
                      <h2 style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>Mapa mental</h2>
                      <p style={{ fontSize: 10, color: "var(--text-3)" }}>Visualización de conceptos</p>
                    </div>
                  </div>
                  <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
                    <MindMap markdown={finalData.final_mindmap} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT PANEL: CHATBOT */}
          <div style={{ width: 360, flexShrink: 0, display: "flex", flexDirection: "column", borderLeft: "1px solid var(--border)", background: "var(--card)", overflow: "hidden" }}>
            <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--accent-dim)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>✨</div>
                <div>
                  <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>Asistente IA</h2>
                  <p style={{ fontSize: 11, color: "var(--text-3)" }}>Pregunta sobre la clase</p>
                </div>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px 0" }}>
              {reportChatHistory.length === 0 && (
                <div style={{ textAlign: "center", marginTop: "4rem" }}>
                  <div style={{ fontSize: "2rem", marginBottom: 10 }}>✨</div>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", lineHeight: 1.6 }}>Haz una pregunta sobre los<br />conceptos o el contenido de la clase</p>
                </div>
              )}
              {reportChatHistory.map((msg, i) => (
                <div key={i} style={{ marginBottom: 12, display: "flex", flexDirection: msg.role === "user" ? "row-reverse" : "row", gap: 8, alignItems: "flex-start" }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: msg.role === "user" ? "var(--accent)" : "linear-gradient(135deg,#7c6df2,#a78bfa)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "white", fontWeight: 700, fontSize: msg.role === "user" ? "0.7rem" : "0.85rem" }}>
                    {msg.role === "user" ? "A" : "🧠"}
                  </div>
                  <div style={{ maxWidth: "76%", background: msg.role === "user" ? "var(--accent)" : "var(--surface)", border: msg.role === "ai" ? "1px solid var(--border)" : "none", borderRadius: msg.role === "user" ? "12px 4px 12px 12px" : "4px 12px 12px 12px", padding: "8px 11px", fontSize: "0.82rem", lineHeight: 1.55, color: msg.role === "user" ? "white" : "var(--text)" }}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {reportChatLoading && (
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 12 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#7c6df2,#a78bfa)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "0.85rem" }}>🧠</div>
                  <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "4px 12px 12px 12px", padding: "8px 14px", color: "var(--text-muted)", fontSize: "0.83rem", letterSpacing: 3 }}>···</div>
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
                  style={{ flex: 1, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "8px 12px", color: "var(--text)", fontSize: "0.83rem", outline: "none" }}
                />
                <button
                  type="submit"
                  disabled={reportChatLoading || !reportChatInput.trim()}
                  style={{ width: 36, height: 36, borderRadius: 10, background: "var(--accent)", border: "none", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem", opacity: reportChatLoading || !reportChatInput.trim() ? 0.45 : 1, flexShrink: 0 }}
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

        <style>{`
          @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        `}</style>
      </div>
    );
  }

  // ─── LIVE CLASS VIEW ───────────────────────────────────────────────────────
  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "var(--bg)", color: "var(--text)", overflow: "hidden" }}>

      {/* Score flash overlay */}
      {scoreFlash && (
        <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 9999, pointerEvents: "none", animation: "scoreFlash 2s ease-out forwards" }}>
          <div style={{ background: "linear-gradient(135deg,#7c6df2,#a78bfa)", borderRadius: 16, padding: "16px 28px", boxShadow: "0 8px 32px rgba(124,108,248,0.5)", textAlign: "center" }}>
            <p style={{ fontSize: "1.8rem", fontWeight: 800, color: "white", margin: 0, letterSpacing: "-0.02em" }}>{scoreFlash}</p>
          </div>
        </div>
      )}

      {/* ── HEADER ── */}
      <header style={{ height: 56, flexShrink: 0, background: "#11111f", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", padding: "0 1.5rem", gap: "1.25rem" }}>
        <VibeLearningLogo />

        <div style={{ width: 1, height: 20, background: "var(--border)", flexShrink: 0 }} />

        <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
          <span style={{ fontSize: 15 }}>📘</span>
          <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>Clase en vivo</span>
        </div>

        {recording && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", display: "inline-block", animation: "pulse 1.5s infinite" }} />
            <span style={{ color: "#22c55e", fontSize: "0.82rem", fontWeight: 600 }}>
              {audioSource === "mic" ? "🎤 Grabando" : audioSource === "system" ? "🖥️ Capturando tab" : "🔀 Mic + Tab"}
            </span>
            <span style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>{formatTimer(elapsed)}</span>
          </div>
        )}

        {/* Score display */}
        {(score > 0 || quizStats.total > 0) && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: 20, padding: "4px 12px" }}>
            <span style={{ color: "#FBBF24", fontWeight: 700, fontSize: "0.85rem" }}>🎯 {score} pts</span>
            {streak >= 2 && (
              <span style={{ color: "#f97316", fontWeight: 700, fontSize: "0.82rem" }}>🔥×{streakMultiplier}</span>
            )}
            {accuracy !== null && (
              <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>{quizStats.correct}/{quizStats.total}</span>
            )}
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
          onClick={finishClass}
          disabled={finishing}
          style={{ background: "var(--accent)", border: "none", borderRadius: 8, padding: "6px 16px", color: "white", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", opacity: finishing ? 0.7 : 1 }}
        >
          {finishing ? "Guardando..." : "Finalizar clase"}
        </button>
      </header>

      {/* ── BODY ── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* 3-column grid */}
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", overflow: "hidden" }}>

          {/* ── COL 2: TRANSCRIPT ── */}
          <div style={{ order: 2, borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "14px 16px 18px", borderBottom: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 12, flexShrink: 0, background: "linear-gradient(180deg, rgba(124,108,248,0.08), rgba(124,108,248,0))" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>Transcript en vivo</span>
                {recording && (
                  <div style={{ display: "flex", alignItems: "center", gap: 5, color: "#22c55e", fontSize: "0.78rem", fontWeight: 600 }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", display: "inline-block", animation: "pulse 1.5s infinite" }} />
                    <span>Escuchando...</span>
                  </div>
                )}
              </div>
              {/* Selector de fuente de audio — solo cuando no está grabando */}
              {!recording && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
                  <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", margin: 0 }}>Fuente de audio</p>
                  <div style={{ display: "flex", gap: 6 }}>
                    {[
                      { key: "mic",    icon: "🎤", label: "Micrófono" },
                      { key: "system", icon: "🖥️", label: "Pantalla / Tab" },
                      { key: "both",   icon: "🔀", label: "Micrófono + Tab" },
                    ].map(({ key, icon, label }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setAudioSource(key)}
                        style={{
                          background: audioSource === key ? "rgba(124,108,248,0.18)" : "var(--surface)",
                          border: `1px solid ${audioSource === key ? "var(--accent)" : "var(--border)"}`,
                          borderRadius: 8,
                          padding: "5px 9px",
                          color: audioSource === key ? "var(--accent)" : "var(--text-muted)",
                          fontSize: "0.72rem",
                          fontWeight: audioSource === key ? 700 : 400,
                          cursor: "pointer",
                          display: "flex", alignItems: "center", gap: 4,
                          transition: "all 0.15s",
                        }}
                      >
                        {icon} {label}
                      </button>
                    ))}
                  </div>
                  {audioSource !== "mic" && (
                    <p style={{ fontSize: "0.68rem", color: "var(--text-muted)", textAlign: "center", lineHeight: 1.5, margin: 0, maxWidth: 260 }}>
                      {audioSource === "system"
                        ? "Elige una pestaña del navegador y activa \"Compartir audio de la pestaña\""
                        : "Primero se pedirá el micrófono y luego la pestaña a compartir"}
                    </p>
                  )}
                </div>
              )}

              <LiveMicButton recording={recording} onToggle={recording ? stopRecording : startRecording} />
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

          </div>

          {/* ── COL 3: CHATBOT ── */}
          <div style={{ order: 3, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ fontSize: 15 }}>✨</span>
                <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>Chatbot RAG</span>
              </div>
              <span style={{ color: "var(--text-muted)", cursor: "pointer", fontSize: "1.1rem", letterSpacing: 2 }}>···</span>
            </div>

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

          {/* ── COL 1: ACTIVE RECALL + CONCEPTOS ── */}
          <div style={{ order: 1, borderRight: "1px solid var(--border)", display: "grid", gridTemplateRows: "minmax(220px, 0.9fr) minmax(0, 1.1fr)", overflow: "hidden" }}>
            <section style={{ borderBottom: "1px solid var(--border)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ fontSize: 15 }}>⚡</span>
                  <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>Active Recall</span>
                </div>
                {quizCountdown !== null && quizAnswer === null && (
                  <span style={{ color: "var(--text-muted)", fontSize: "0.76rem", fontVariantNumeric: "tabular-nums" }}>{quizCountdown}s</span>
                )}
              </div>

              {quiz ? (
                <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px", background: "rgba(124,109,242,0.04)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <span style={{ background: "rgba(124,109,242,0.15)", color: "var(--accent)", fontSize: "0.7rem", borderRadius: 20, padding: "2px 8px", fontWeight: 600, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {quiz.concept}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                      {streak >= 2 && quizAnswer === null && (
                        <span style={{ background: "rgba(249,115,22,0.12)", color: "#f97316", fontSize: "0.7rem", borderRadius: 20, padding: "2px 8px", fontWeight: 700 }}>
                          🔥×{streakMultiplier}
                        </span>
                      )}
                      <span style={{ background: "rgba(251,191,36,0.1)", color: "#FBBF24", fontSize: "0.7rem", borderRadius: 20, padding: "2px 8px", fontWeight: 600 }}>
                        {quizAnswer === null
                          ? `+${10 * streakMultiplier} pts`
                          : quizAnswer === quiz.correct
                            ? `+${10 * getStreakMultiplier(streak)} pts`
                            : "+0 pts"}
                      </span>
                    </div>
                  </div>

                  <p style={{ fontSize: "0.85rem", marginBottom: 10, color: "var(--text)", fontWeight: 500, lineHeight: 1.45 }}>{quiz.question}</p>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 6 }}>
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
                          style={{ background: bg, border: `1px solid ${borderColor}`, borderRadius: 8, padding: "7px 10px", textAlign: "left", cursor: quizAnswer !== null ? "default" : "pointer", display: "flex", alignItems: "center", gap: 7, transition: "all 0.15s" }}
                        >
                          <span style={{ width: 14, height: 14, borderRadius: "50%", border: `2px solid ${borderColor}`, background: isSelected || (quizAnswer !== null && isCorrect) ? borderColor : "transparent", flexShrink: 0, display: "inline-block", transition: "all 0.15s" }} />
                          <span style={{ fontSize: "0.77rem", color: textColor, lineHeight: 1.35 }}><strong>{opt}.</strong> {quiz.options[opt]}</span>
                        </button>
                      );
                    })}
                  </div>

                  {quizAnswer !== null && (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: "0.82rem", fontWeight: 700, color: quizAnswer === quiz.correct ? "#22c55e" : "#ef4444" }}>
                          {quizAnswer === quiz.correct
                            ? `✓ Correcto${streak >= 2 ? ` — Racha ${streak} 🔥` : ""}`
                            : `✗ Incorrecto — Respuesta correcta: ${quiz.correct}`}
                        </span>
                        <button onClick={closeQuiz} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "0.77rem", flexShrink: 0 }}>Cerrar</button>
                      </div>

                      <div style={{ marginTop: 8, height: 3, background: "var(--border)", borderRadius: 10, overflow: "hidden" }}>
                        <div style={{
                          height: "100%",
                          background: quizAnswer === quiz.correct ? "#22c55e" : "#ef4444",
                          borderRadius: 10,
                          animation: `shrinkBar ${QUIZ_RESULT_DELAY}ms linear forwards`,
                        }} />
                      </div>
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
              ) : (
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "18px", textAlign: "center" }}>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", lineHeight: 1.6 }}>
                    Las preguntas aparecerán aquí<br />durante la clase en vivo
                  </p>
                </div>
              )}
            </section>

            <section style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
                <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>Conceptos clave</span>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 20, padding: "2px 8px" }}>{concepts.length}</span>
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
                        <span style={{ flex: 1, fontWeight: 600, fontSize: "0.87rem", color: isExpanded ? "var(--accent)" : "var(--text)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</span>
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
                            �? Ver ejemplo
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

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
            </section>
          </div>

        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes scoreFlash {
          0%   { opacity: 0; transform: translate(-50%,-60%) scale(0.8); }
          20%  { opacity: 1; transform: translate(-50%,-50%) scale(1.05); }
          70%  { opacity: 1; transform: translate(-50%,-50%) scale(1); }
          100% { opacity: 0; transform: translate(-50%,-40%) scale(0.95); }
        }
        @keyframes shrinkBar {
          from { width: 100%; }
          to   { width: 0%; }
        }
        .live-mic-button {
          position: relative;
          width: 78px;
          height: 78px;
          border: 1px solid rgba(167,139,250,0.48);
          border-radius: 50%;
          color: white;
          background:
            radial-gradient(circle at 34% 28%, rgba(255,255,255,0.32), transparent 27%),
            linear-gradient(135deg, #7c6cf8 0%, #9b8cff 52%, #5b8def 100%);
          box-shadow: 0 18px 44px rgba(124,108,248,0.36), inset 0 1px 0 rgba(255,255,255,0.22);
          display: grid;
          place-items: center;
          cursor: pointer;
          transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease, filter 160ms ease;
          z-index: 2;
        }
        .live-mic-button:hover {
          transform: translateY(-1px) scale(1.03);
          box-shadow: 0 22px 54px rgba(124,108,248,0.44), inset 0 1px 0 rgba(255,255,255,0.26);
        }
        .live-mic-button:active {
          transform: scale(0.96);
        }
        .live-mic-button.is-recording {
          border-color: rgba(248,113,113,0.55);
          background:
            radial-gradient(circle at 34% 28%, rgba(255,255,255,0.28), transparent 27%),
            linear-gradient(135deg, #ef4444 0%, #fb7185 56%, #f97316 100%);
          box-shadow: 0 18px 48px rgba(239,68,68,0.34), inset 0 1px 0 rgba(255,255,255,0.2);
          animation: micBreath 1.2s ease-in-out infinite;
        }
        .mic-ring {
          position: absolute;
          width: 82px;
          height: 82px;
          border: 1px solid rgba(248,113,113,0.38);
          border-radius: 50%;
          animation: micWave 1.65s ease-out infinite;
        }
        .mic-ring-two {
          animation-delay: 0.55s;
        }
        .mic-orbit {
          position: absolute;
          width: 102px;
          height: 102px;
          border-radius: 50%;
          border: 1px dashed rgba(248,113,113,0.28);
          animation: micSpin 8s linear infinite;
        }
        .mic-level {
          width: 4px;
          height: 7px;
          border-radius: 99px;
          background: #f87171;
          box-shadow: 0 0 12px rgba(248,113,113,0.55);
          animation: micLevel 680ms ease-in-out infinite alternate;
        }
        @keyframes micWave {
          0% { opacity: 0.72; transform: scale(0.86); }
          100% { opacity: 0; transform: scale(1.42); }
        }
        @keyframes micBreath {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.12); }
        }
        @keyframes micSpin {
          to { transform: rotate(360deg); }
        }
        @keyframes micLevel {
          0% { height: 6px; opacity: 0.5; }
          45% { height: 18px; opacity: 1; }
          100% { height: 10px; opacity: 0.75; }
        }
      `}</style>
    </div>
  );
}
