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

const TYPE_BADGE = {
  whiteboard:  { bg: "rgba(20,184,166,0.15)",  fg: "#2DD4BF", label: "Pizarrón"    },
  slide:       { bg: "rgba(96,165,250,0.15)",   fg: "#60A5FA", label: "Diapositiva" },
  diagram:     { bg: "rgba(124,108,248,0.15)",  fg: "#A78BFA", label: "Diagrama"    },
  graph:       { bg: "rgba(34,197,94,0.15)",    fg: "#22C55E", label: "Gráfico"     },
  formula:     { bg: "rgba(251,191,36,0.15)",   fg: "#FBBF24", label: "Fórmula"     },
  table:       { bg: "rgba(249,115,22,0.15)",   fg: "#FB923C", label: "Tabla"       },
  screenshot:  { bg: "rgba(99,102,241,0.15)",   fg: "#818CF8", label: "Captura"     },
  photo:       { bg: "rgba(239,68,68,0.15)",    fg: "#F87171", label: "Foto"        },
  other:       { bg: "rgba(255,255,255,0.08)",  fg: "#9CA3AF", label: "Visual"      },
};

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
  const [reportChatHistory, setReportChatHistory] = useState([]);
  const [reportChatInput, setReportChatInput] = useState("");
  const [reportChatLoading, setReportChatLoading] = useState(false);

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
  const visualNotesRef = useRef([]);
  const reportChatEndRef = useRef(null);

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
    visualNotesRef.current = visualNotes;
  }, [visualNotes]);

  useEffect(() => {
    reportChatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [reportChatHistory, reportChatLoading]);

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
          visual_context: buildVisualContext(visualNotesRef.current),
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

  function buildVisualContext(notes) {
    if (!notes.length) return "";
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

  // Resize + compress to JPEG max 1024px, quality 0.82 — stays well under 4MB limit
  function compressBlob(blob) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(blob);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const MAX = 1024;
        let w = img.naturalWidth;
        let h = img.naturalHeight;
        if (w > MAX || h > MAX) {
          const r = Math.min(MAX / w, MAX / h);
          w = Math.round(w * r);
          h = Math.round(h * r);
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        canvas.toBlob((b) => resolve(b), "image/jpeg", 0.82);
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  async function processImageBlob(blob, source) {
    setAnalyzeLoading(true);
    const previewUrl = URL.createObjectURL(blob);
    try {
      // Compress before sending — reduces 4K screenshots from ~8MB to ~200-400KB
      const compressed = await compressBlob(blob);
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result.split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(compressed);
      });

      // Upload original blob to Supabase Storage — storagePath is null if upload fails
      let storagePath = null;
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const candidatePath = `${user.id}/${classId}/${Date.now()}.jpg`;
          const { error: uploadError } = await supabase.storage
            .from("class-images")
            .upload(candidatePath, compressed, { contentType: "image/jpeg" });
          if (uploadError) {
            console.error("[visual-notes] Storage upload failed:", uploadError.message);
          } else {
            storagePath = candidatePath;
          }
        }
      } catch (uploadEx) {
        console.error("[visual-notes] Storage exception:", uploadEx?.message);
      }

      // Analyze with Groq vision — drives the RAG, independent of storage success
      const res = await fetch("/api/analyze-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType: "image/jpeg",
          transcript: transcriptRef.current.slice(-2000),
        }),
      });
      const json = await res.json();

      if (!res.ok || (!json.description && !json.extracted_text && !json.key_concepts?.length)) {
        console.error("[visual-notes] analyze-image returned no content (status", res.status, "):", json);
      }

      const newNote = {
        id: Date.now(),
        previewUrl,
        storagePath,
        source,
        content_type:   json.content_type   || "other",
        description:    json.description    || "",
        extracted_text: json.extracted_text || null,
        key_concepts:   json.key_concepts   || [],
        gaps:           json.gaps           || null,
      };
      // Update ref BEFORE setState so sendChatText always reads fresh data
      visualNotesRef.current = [...visualNotesRef.current, newNote];
      setVisualNotes([...visualNotesRef.current]);
    } catch (err) {
      console.error("[visual-notes] processImageBlob error:", err?.message);
    }
    setAnalyzeLoading(false);
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
          visual_context: buildVisualContext(visualNotesRef.current),
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

    return (
      <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "var(--bg)", overflow: "hidden" }}>

        {/* ── HEADER ── */}
        <header style={{ height: 56, flexShrink: 0, background: "#11111f", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", padding: "0 1.25rem", gap: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,#7c6df2,#a78bfa)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🧠</div>
            <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>Aula AI</span>
          </div>
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

          {/* LEFT PANEL */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

            {/* Metrics row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, padding: "14px 16px", flexShrink: 0, borderBottom: "1px solid var(--border)" }}>
              {[
                { icon: <RI s={15}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></RI>, bg: "rgba(124,108,248,0.12)", fg: "var(--accent)", label: "Conceptos", val: concepts.length || 0 },
                { icon: <RI s={15}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></RI>, bg: "rgba(96,165,250,0.12)", fg: "#60A5FA", label: "Duración", val: durationFmt || "—" },
                { icon: <RI s={15}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></RI>, bg: "rgba(34,197,94,0.12)", fg: "var(--green)", label: "Fragmentos", val: transcriptLines.length || 0 },
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
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", padding: "14px 16px", gap: 12 }}>

              {/* AI Summary */}
              {finalData.final_summary && (
                <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, display: "flex", flexDirection: "column", flex: "0 0 auto", maxHeight: "42%", minHeight: 0, overflow: "hidden" }}>
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
                <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "hidden" }}>
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

            {/* Messages */}
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

            {/* Input */}
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
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
          }
        `}</style>
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
              {visualNotes.map((note) => {
                const tb = TYPE_BADGE[note.content_type] || TYPE_BADGE.other;
                return (
                  <div key={note.id} style={{ marginBottom: 8, borderRadius: 8, border: "1px solid var(--border)", background: "rgba(255,255,255,0.02)", overflow: "hidden" }}>
                    <div style={{ position: "relative" }}>
                      <img src={note.previewUrl} alt="" style={{ width: "100%", height: 68, objectFit: "cover", display: "block" }} />
                      <span style={{ position: "absolute", top: 4, left: 4, fontSize: "0.58rem", fontWeight: 700, color: tb.fg, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)", borderRadius: 99, padding: "2px 6px", border: `1px solid ${tb.fg}40` }}>{tb.label}</span>
                    </div>
                    <div style={{ padding: "6px 8px" }}>
                      <p style={{ fontSize: "0.68rem", color: "var(--text-2)", lineHeight: 1.5, marginBottom: (note.extracted_text || note.gaps) ? 5 : 0 }}>{note.description}</p>
                      {note.extracted_text && (
                        <div style={{ background: "rgba(124,108,248,0.06)", border: "1px solid rgba(124,108,248,0.14)", borderRadius: 5, padding: "4px 7px", marginBottom: note.gaps ? 5 : 0 }}>
                          <span style={{ fontSize: "0.6rem", fontWeight: 700, color: "var(--accent)" }}>OCR: </span>
                          <span style={{ fontSize: "0.6rem", color: "var(--text-2)", fontFamily: "monospace", lineHeight: 1.4 }}>{note.extracted_text.length > 130 ? note.extracted_text.slice(0, 130) + "…" : note.extracted_text}</span>
                        </div>
                      )}
                      {note.gaps && (
                        <div style={{ background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.18)", borderRadius: 5, padding: "4px 7px" }}>
                          <span style={{ fontSize: "0.63rem", fontWeight: 700, color: "var(--yellow)" }}>⚠ Gap: </span>
                          <span style={{ fontSize: "0.63rem", color: "var(--text-2)" }}>{note.gaps}</span>
                        </div>
                      )}
                    </div>
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
