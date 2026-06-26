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

/* ── Post-class report helpers ────────────────────────────────────────── */
function RI({ s = 16, children }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}
const REPORT_PALETTE = [
  { bg: "rgba(124,108,248,0.1)", fg: "#A78BFA" },
  { bg: "rgba(96,165,250,0.1)",  fg: "#60A5FA" },
  { bg: "rgba(34,197,94,0.1)",   fg: "#22C55E" },
  { bg: "rgba(251,191,36,0.1)",  fg: "#FBBF24" },
  { bg: "rgba(239,68,68,0.1)",   fg: "#EF4444" },
  { bg: "rgba(20,184,166,0.1)",  fg: "#2DD4BF" },
];

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
  const [visualNotes, setVisualNotes] = useState([]);
  const [showCamera, setShowCamera] = useState(false);
  const [analyzeLoading, setAnalyzeLoading] = useState(false);

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
  const cameraVideoRef = useRef(null);
  const cameraStreamRef = useRef(null);

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

  async function processImageBlob(blob, source) {
    setAnalyzeLoading(true);
    const previewUrl = URL.createObjectURL(blob);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target.result.split(",")[1];
      const mimeType = blob.type || "image/jpeg";

      // Upload to Supabase Storage
      let storagePath = null;
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        const ext = mimeType.includes("png") ? "png" : "jpg";
        storagePath = `${user.id}/${classId}/${Date.now()}.${ext}`;
        await supabase.storage.from("class-images").upload(storagePath, blob, { contentType: mimeType });
      } catch {}

      // Analyze with Gemini
      try {
        const res = await fetch("/api/analyze-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: base64,
            mimeType,
            transcript: transcriptRef.current.slice(-2000),
          }),
        });
        const json = await res.json();
        setVisualNotes((prev) => [...prev, {
          id: Date.now(),
          previewUrl,
          storagePath,
          source,
          description: json.description || "",
          key_concepts: json.key_concepts || [],
          gaps: json.gaps || null,
        }]);
      } catch {}
      setAnalyzeLoading(false);
    };
    reader.readAsDataURL(blob);
  }

  async function captureScreen() {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const video = document.createElement("video");
      video.srcObject = stream;
      await new Promise((r) => { video.onloadedmetadata = r; });
      await video.play();
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d").drawImage(video, 0, 0);
      stream.getTracks().forEach((t) => t.stop());
      canvas.toBlob((blob) => processImageBlob(blob, "screenshot"), "image/png");
    } catch (err) {
      if (err.name !== "NotAllowedError") console.error("[captureScreen]", err);
    }
  }

  async function openCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      cameraStreamRef.current = stream;
      setShowCamera(true);
      setTimeout(() => {
        if (cameraVideoRef.current) cameraVideoRef.current.srcObject = stream;
      }, 60);
    } catch (err) {
      alert("No se pudo acceder a la cámara: " + err.message);
    }
  }

  function captureFromCamera() {
    const video = cameraVideoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
    setShowCamera(false);
    canvas.toBlob((blob) => processImageBlob(blob, "camera"), "image/jpeg");
  }

  function closeCamera() {
    cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
    setShowCamera(false);
  }

  function handleImageFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    processImageBlob(file, "upload");
    e.target.value = "";
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
          visual_notes: visualNotes.map(({ previewUrl, ...rest }) => rest),
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

  // ─── POST-CLASS REPORT ────────────────────────────────────────────────────
  if (finalData) {
    const classDate = new Date().toLocaleDateString("es-MX", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
    const durationFmt = (() => {
      if (elapsed <= 0) return null;
      const m = Math.floor(elapsed / 60);
      const s = elapsed % 60;
      if (m === 0) return `${s}s`;
      return s > 0 ? `${m} min ${s}s` : `${m} min`;
    })();
    const summaryExcerpt = (() => {
      const paras = (finalData.final_summary || "")
        .split(/\n{2,}/)
        .map(p => p.trim().replace(/^#+\s*/, "").replace(/\*\*/g, "").trim())
        .filter(p => p.length > 40 && !p.startsWith("-") && !p.startsWith("•"));
      return paras[0]?.slice(0, 155) || null;
    })();

    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", paddingBottom: 96 }}>
        <div style={{ maxWidth: 1060, margin: "0 auto", padding: "48px 36px 0" }}>

          {/* ── 1. HERO ─────────────────────────────────────────────────── */}
          <div style={{
            background: "linear-gradient(135deg, rgba(124,108,248,0.09) 0%, #171721 55%)",
            border: "1px solid rgba(124,108,248,0.18)",
            borderRadius: 20, padding: "40px 44px",
            marginBottom: 24, position: "relative", overflow: "hidden",
          }}>
            <div style={{ position: "absolute", top: -80, right: -80, width: 360, height: 360, borderRadius: "50%", background: "radial-gradient(circle, rgba(124,108,248,0.07), transparent 70%)", pointerEvents: "none" }} />
            <div style={{ position: "absolute", bottom: -60, left: -40, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(124,108,248,0.04), transparent 70%)", pointerEvents: "none" }} />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 32 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(34,197,94,0.1)", color: "#22C55E", border: "1px solid rgba(34,197,94,0.2)", fontSize: 12, fontWeight: 600, borderRadius: 99, padding: "5px 13px", marginBottom: 20, letterSpacing: "0.02em" }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22C55E", display: "inline-block" }} />
                  Clase completada
                </span>
                <h1 style={{ fontSize: 30, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.025em", lineHeight: 1.2, marginBottom: 16 }}>{finalData.title}</h1>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 16, color: "var(--text-2)", fontSize: 13, marginBottom: summaryExcerpt ? 20 : 0 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <RI s={13}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></RI>
                    {classDate}
                  </span>
                  {durationFmt && <><span style={{ opacity: 0.25 }}>·</span><span style={{ display: "flex", alignItems: "center", gap: 5 }}><RI s={13}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></RI>{durationFmt}</span></>}
                  {concepts.length > 0 && <><span style={{ opacity: 0.25 }}>·</span><span style={{ display: "flex", alignItems: "center", gap: 5 }}><RI s={13}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></RI>{concepts.length} conceptos</span></>}
                </div>
                {summaryExcerpt && <p style={{ fontSize: 14, color: "var(--text-2)", lineHeight: 1.75, maxWidth: 560, fontStyle: "italic", opacity: 0.8 }}>"{summaryExcerpt}{summaryExcerpt.length >= 155 ? "..." : ""}"</p>}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10, flexShrink: 0 }}>
                <button onClick={() => (window.location.href = "/dashboard")} className="btn-accent" style={{ background: "var(--accent)", color: "white", border: "none", borderRadius: "var(--radius-btn)", padding: "11px 22px", fontWeight: 600, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>
                  Ir al dashboard <RI s={15}><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></RI>
                </button>
                {transcriptLines.length > 0 && (
                  <button onClick={() => document.getElementById("vl-transcript")?.scrollIntoView({ behavior: "smooth" })} className="btn-ghost" style={{ background: "transparent", color: "var(--text-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-btn)", padding: "11px 22px", fontWeight: 500, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" }}>
                    Ver transcript <RI s={15}><polyline points="9 18 15 12 9 6"/></RI>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ── 2. MÉTRICAS ─────────────────────────────────────────────── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
            {[
              { icon: <RI s={20}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></RI>, bg: "rgba(124,108,248,0.12)", fg: "var(--accent)", label: "Conceptos detectados", val: concepts.length || 0 },
              { icon: <RI s={20}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></RI>, bg: "rgba(96,165,250,0.12)", fg: "#60A5FA", label: "Tiempo de clase", val: durationFmt || "—" },
              { icon: <RI s={20}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></RI>, bg: "rgba(34,197,94,0.12)", fg: "var(--green)", label: "Fragmentos de transcript", val: transcriptLines.length || 0 },
              { icon: <RI s={20}><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></RI>, bg: materialSummary ? "rgba(251,191,36,0.12)" : "rgba(255,255,255,0.04)", fg: materialSummary ? "var(--yellow)" : "var(--text-3)", label: "Material de apoyo", val: materialSummary ? "Cargado" : "Sin material" },
            ].map(({ icon, bg, fg, label, val }, i) => (
              <div key={i} className="stat-lift" style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, padding: "24px" }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: bg, color: fg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>{icon}</div>
                <p style={{ fontSize: 26, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em", lineHeight: 1, marginBottom: 6 }}>{val}</p>
                <p style={{ fontSize: 12, fontWeight: 500, color: "var(--text-2)" }}>{label}</p>
              </div>
            ))}
          </div>

          {/* ── 3. RESUMEN IA ───────────────────────────────────────────── */}
          {finalData.final_summary && (
            <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, padding: "32px 36px", marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--accent-dim)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <RI s={18}><path d="m12 3-1.9 5.8a2 2 0 0 1-1.287 1.288L3 12l5.8 1.9a2 2 0 0 1 1.288 1.287L12 21l1.9-5.8a2 2 0 0 1 1.287-1.288L21 12l-5.8-1.9a2 2 0 0 1-1.288-1.287Z"/></RI>
                  </div>
                  <div>
                    <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>Resumen generado por IA</h2>
                    <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>Análisis completo de tu sesión de aprendizaje</p>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {concepts.length > 0 && <span style={{ fontSize: 11, fontWeight: 600, color: "var(--accent)", background: "var(--accent-dim)", borderRadius: 99, padding: "4px 10px" }}>{concepts.length} conceptos</span>}
                  {durationFmt && <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-2)", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", borderRadius: 99, padding: "4px 10px" }}>{durationFmt}</span>}
                </div>
              </div>
              <div style={{ height: 1, background: "var(--border)", marginBottom: 24 }} />
              <div style={{ fontSize: 15, color: "var(--text-2)", lineHeight: 1.8 }}>
                <ReactMarkdown
                  components={{
                    h1: ({children}) => <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", margin: "24px 0 12px", letterSpacing: "-0.02em" }}>{children}</h1>,
                    h2: ({children}) => <h2 style={{ fontSize: 17, fontWeight: 600, color: "var(--text)", margin: "20px 0 10px" }}>{children}</h2>,
                    h3: ({children}) => <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-2)", margin: "16px 0 8px" }}>{children}</h3>,
                    p:  ({children}) => <p style={{ margin: "0 0 14px", color: "var(--text-2)", lineHeight: 1.8 }}>{children}</p>,
                    strong: ({children}) => <strong style={{ color: "var(--text)", fontWeight: 600 }}>{children}</strong>,
                    ul: ({children}) => <ul style={{ paddingLeft: 22, margin: "0 0 14px" }}>{children}</ul>,
                    ol: ({children}) => <ol style={{ paddingLeft: 22, margin: "0 0 14px" }}>{children}</ol>,
                    li: ({children}) => <li style={{ marginBottom: 6, color: "var(--text-2)" }}>{children}</li>,
                    code: ({children}) => <code style={{ background: "rgba(124,108,248,0.1)", color: "var(--accent)", borderRadius: 4, padding: "2px 6px", fontSize: "0.88em" }}>{children}</code>,
                  }}
                >
                  {finalData.final_summary}
                </ReactMarkdown>
              </div>
            </div>
          )}

          {/* ── 4. MAPA MENTAL ──────────────────────────────────────────── */}
          {finalData.final_mindmap && (
            <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, padding: "28px 32px", marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(96,165,250,0.1)", color: "#60A5FA", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <RI s={18}><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></RI>
                </div>
                <div>
                  <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>Mapa mental</h2>
                  <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>Visualización de conceptos y relaciones</p>
                </div>
              </div>
              <MindMap markdown={finalData.final_mindmap} />
            </div>
          )}

          {/* ── 5. CONCEPTOS ────────────────────────────────────────────── */}
          {concepts.length > 0 && (
            <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, padding: "28px 32px", marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--accent-dim)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <RI s={18}><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></RI>
                </div>
                <div>
                  <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>Conceptos aprendidos</h2>
                  <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>{concepts.length} detectados en esta sesión</p>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {concepts.map((c, i) => {
                  const pal = REPORT_PALETTE[i % REPORT_PALETTE.length];
                  const name = typeof c === "string" ? c : c.name;
                  const summary = typeof c === "object" ? c.summary : "";
                  return (
                    <div key={i} style={{ display: "flex", gap: 12, padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: pal.fg, flexShrink: 0, marginTop: 6 }} />
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{name}</p>
                        {summary && <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4, lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{summary}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── 5.5 NOTAS VISUALES ──────────────────────────────────────── */}
          {visualNotes.length > 0 && (
            <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, padding: "28px 32px", marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(96,165,250,0.1)", color: "#60A5FA", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <RI s={18}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 0 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></RI>
                </div>
                <div>
                  <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>Notas visuales de la clase</h2>
                  <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>{visualNotes.length} imagen{visualNotes.length !== 1 ? "es" : ""} analizadas por Gemini</p>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
                {visualNotes.map((note) => (
                  <div key={note.id} style={{ borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden", background: "rgba(255,255,255,0.02)" }}>
                    <img src={note.previewUrl} alt="" style={{ width: "100%", height: 140, objectFit: "cover", display: "block" }} />
                    <div style={{ padding: "12px 14px" }}>
                      {note.key_concepts?.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
                          {note.key_concepts.map((kc, j) => (
                            <span key={j} style={{ fontSize: 10, fontWeight: 600, color: "var(--accent)", background: "var(--accent-dim)", borderRadius: 99, padding: "2px 8px" }}>{kc}</span>
                          ))}
                        </div>
                      )}
                      <p style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.6, marginBottom: note.gaps ? 8 : 0 }}>{note.description}</p>
                      {note.gaps && (
                        <div style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.18)", borderRadius: 8, padding: "7px 10px" }}>
                          <p style={{ fontSize: 11, fontWeight: 700, color: "var(--yellow)", marginBottom: 3 }}>⚠ Información visual no verbalizada</p>
                          <p style={{ fontSize: 11, color: "var(--text-2)", lineHeight: 1.5 }}>{note.gaps}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── 6. MATERIAL ─────────────────────────────────────────────── */}
          {materialSummary && (
            <div style={{ background: "var(--card)", border: "1px solid rgba(251,191,36,0.12)", borderRadius: 16, padding: "28px 32px", marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(251,191,36,0.1)", color: "var(--yellow)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <RI s={18}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></RI>
                  </div>
                  <div>
                    <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>Material de apoyo</h2>
                    <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>Resumen del PDF cargado en clase</p>
                  </div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, color: "var(--yellow)", background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.15)", borderRadius: 99, padding: "3px 9px", letterSpacing: "0.05em" }}>PDF</span>
              </div>
              <p style={{ fontSize: 14, color: "var(--text-2)", lineHeight: 1.75 }}>{materialSummary}</p>
            </div>
          )}

          {/* ── 7. TRANSCRIPT ───────────────────────────────────────────── */}
          {transcriptLines.length > 0 && (
            <details id="vl-transcript" style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, marginBottom: 24, overflow: "hidden" }}>
              <summary style={{ padding: "20px 28px", cursor: "pointer", listStyle: "none", display: "flex", alignItems: "center", justifyContent: "space-between", userSelect: "none" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 9, color: "var(--text-2)", fontSize: 14, fontWeight: 500 }}>
                  <RI s={16}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></RI>
                  Transcript de la clase
                  <span style={{ fontSize: 11, color: "var(--text-3)" }}>({transcriptLines.length} fragmentos)</span>
                </span>
                <span style={{ fontSize: 11, color: "var(--accent)", fontWeight: 600 }}>Ver / ocultar</span>
              </summary>
              <div style={{ padding: "0 28px 24px", maxHeight: 420, overflowY: "auto", borderTop: "1px solid var(--border)" }}>
                {transcriptLines.map((line, i) => (
                  <div key={i} style={{ display: "flex", gap: 16, padding: "14px 0", borderBottom: i < transcriptLines.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                    <span style={{ fontSize: 11, color: "var(--text-3)", whiteSpace: "nowrap", paddingTop: 2, flexShrink: 0 }}>{line.time}</span>
                    <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.65 }}>{line.text}</p>
                  </div>
                ))}
              </div>
            </details>
          )}

          {/* ── 8. SIGUIENTE PASO ───────────────────────────────────────── */}
          <div style={{ background: "linear-gradient(135deg, rgba(124,108,248,0.1) 0%, #171721 60%)", border: "1px solid rgba(124,108,248,0.2)", borderRadius: 20, padding: "36px 40px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24 }}>
            <div>
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--accent)", letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Siguiente paso</span>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em", marginBottom: 8 }}>¿Listo para seguir aprendiendo?</h2>
              <p style={{ fontSize: 14, color: "var(--text-2)", lineHeight: 1.65, maxWidth: 400 }}>Cada sesión te acerca más a dominar el tema. Revisa tu progreso o inicia una nueva clase.</p>
            </div>
            <div style={{ display: "flex", gap: 12, flexShrink: 0 }}>
              <button onClick={() => (window.location.href = "/class/new")} className="btn-accent" style={{ background: "var(--accent)", color: "white", border: "none", borderRadius: "var(--radius-btn)", padding: "12px 24px", fontWeight: 600, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>
                <RI s={15}><polygon points="5 3 19 12 5 21 5 3"/></RI> Nueva clase
              </button>
              <button onClick={() => (window.location.href = "/dashboard")} className="btn-ghost" style={{ background: "transparent", color: "var(--text-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-btn)", padding: "12px 24px", fontWeight: 500, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" }}>
                Ir al dashboard <RI s={15}><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></RI>
              </button>
            </div>
          </div>

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

            {/* Visual Notes capture panel */}
            <div style={{ padding: "12px 12px 0", flexShrink: 0, borderTop: "1px solid var(--border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: "0.74rem", fontWeight: 600, color: "var(--text-2)", display: "flex", alignItems: "center", gap: 5 }}>
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 0 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                  Notas visuales {visualNotes.length > 0 && `(${visualNotes.length})`}
                </span>
                {analyzeLoading && <span style={{ fontSize: "0.68rem", color: "var(--accent)", fontWeight: 600, animation: "pulse 1.5s infinite" }}>Analizando...</span>}
              </div>
              <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
                <button onClick={captureScreen} title="Capturar pantalla" style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: 7, padding: "5px 2px", color: "var(--text-2)", fontSize: "0.68rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 3 }}>
                  🖥️ Pantalla
                </button>
                <button onClick={openCamera} title="Tomar foto" style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: 7, padding: "5px 2px", color: "var(--text-2)", fontSize: "0.68rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 3 }}>
                  📷 Cámara
                </button>
                <label style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: 7, padding: "5px 2px", color: "var(--text-2)", fontSize: "0.68rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 3 }}>
                  <input type="file" accept="image/*" onChange={handleImageFile} style={{ display: "none" }} />
                  📂 Archivo
                </label>
              </div>
              {visualNotes.length === 0 && !analyzeLoading && (
                <p style={{ fontSize: "0.67rem", color: "var(--text-3)", textAlign: "center", paddingBottom: 8, lineHeight: 1.5 }}>Captura diapositivas o pizarrón para complementar el transcript</p>
              )}
              {visualNotes.map((note) => (
                <div key={note.id} style={{ marginBottom: 8, borderRadius: 8, border: "1px solid var(--border)", background: "rgba(255,255,255,0.02)", overflow: "hidden" }}>
                  <img src={note.previewUrl} alt="" style={{ width: "100%", height: 68, objectFit: "cover", display: "block" }} />
                  <div style={{ padding: "6px 8px" }}>
                    <p style={{ fontSize: "0.68rem", color: "var(--text-2)", lineHeight: 1.5, marginBottom: note.gaps ? 5 : 0 }}>{note.description}</p>
                    {note.gaps && (
                      <div style={{ background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.18)", borderRadius: 5, padding: "4px 7px" }}>
                        <span style={{ fontSize: "0.63rem", fontWeight: 700, color: "var(--yellow)" }}>⚠ Gap: </span>
                        <span style={{ fontSize: "0.63rem", color: "var(--text-2)" }}>{note.gaps}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
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

      {/* ── CAMERA MODAL ────────────────────────────────────────────────────── */}
      {showCamera && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "var(--card)", border: "1px solid var(--border-strong)", borderRadius: 20, padding: 24, width: 480, maxWidth: "92vw" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <span style={{ fontWeight: 700, fontSize: "0.95rem", display: "flex", alignItems: "center", gap: 7 }}>📷 Tomar foto</span>
              <button onClick={closeCamera} style={{ background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 6, color: "var(--text-2)", cursor: "pointer", fontSize: 18, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
            </div>
            <video ref={cameraVideoRef} autoPlay playsInline muted style={{ width: "100%", borderRadius: 12, background: "#000", display: "block", maxHeight: 320, objectFit: "cover" }} />
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <button onClick={captureFromCamera} className="btn-accent" style={{ flex: 1, background: "var(--accent)", color: "white", border: "none", borderRadius: "var(--radius-btn)", padding: "11px", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
                📸 Capturar
              </button>
              <button onClick={closeCamera} className="btn-ghost" style={{ flex: 1, background: "transparent", color: "var(--text-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-btn)", padding: "11px", fontWeight: 500, fontSize: 14, cursor: "pointer" }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
