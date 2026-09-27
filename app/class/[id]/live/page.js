"use client";
import { useRef, useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

import { CHUNK_INTERVAL, QUIZ_INTERVAL, QUIZ_MIN_WORDS, QUIZ_RESULT_DELAY, WINDOW_CHUNKS } from "./_components/constants";
import { TYPE_BADGE, nowHMS, wordCount } from "./_components/shared";
import LiveHeader from "./_components/LiveHeader";
import TranscriptPanel from "./_components/TranscriptPanel";
import ChatPanel from "./_components/ChatPanel";
import RecallPanel from "./_components/RecallPanel";
import Toast from "./_components/Toast";
import CameraModal from "./_components/CameraModal";
import LiveStyles from "./_components/LiveStyles";
import FinalReport from "./_components/FinalReport";

export default function LiveClass() {
  const { id: classId } = useParams();

  const [recording, setRecording] = useState(false);
  const [audioSource, setAudioSource] = useState("mic"); // "mic" | "system" | "both"
  const [visualSource, setVisualSource] = useState(null); // null | "screenshot" | "upload" | "camera"
  const [micExpanded, setMicExpanded] = useState(false);
  const [camExpanded, setCamExpanded] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [transcriptLines, setTranscriptLines] = useState([]);
  const [concepts, setConcepts] = useState([]);
  const [expandedConcept, setExpandedConcept] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [quizAnswer, setQuizAnswer] = useState(null);
  const [nextQuizIn, setNextQuizIn] = useState(null); // segundos para la próxima pregunta
  const [materialSummary, setMaterialSummary] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [chatQuestion, setChatQuestion] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [finalData, setFinalData] = useState(null);
  const [canvasNodes, setCanvasNodes] = useState([]);
  const [canvasLoading, setCanvasLoading] = useState(false);
  const [canvasError, setCanvasError] = useState(false);
  const [visualNotes, setVisualNotes] = useState([]);
  const [showCamera, setShowCamera] = useState(false);
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [reportChatHistory, setReportChatHistory] = useState([]);
  const [reportChatInput, setReportChatInput] = useState("");
  const [reportChatLoading, setReportChatLoading] = useState(false);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [col2Tab, setCol2Tab] = useState("transcript"); // "transcript" | "images"
  const [toast, setToast] = useState(null); // { msg, type: "error" | "success" }
  const [pdfUploading, setPdfUploading] = useState(false);
  const toastTimerRef = useRef(null);

  function showToast(msg, type = "error") {
    clearTimeout(toastTimerRef.current);
    setToast({ msg, type });
    toastTimerRef.current = setTimeout(() => setToast(null), 6000);
  }
  const mapCardRef = useRef(null);

  useEffect(() => {
    function onFsChange() { setIsMapFullscreen(!!document.fullscreenElement); }
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  async function toggleMapFullscreen() {
    if (!document.fullscreenElement) {
      await mapCardRef.current?.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  }

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
  const cameraVideoRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const fileInputRef = useRef(null);
  const visualNotesRef = useRef([]);
  const reportChatEndRef = useRef(null);
  const micStreamRef = useRef(null);
  const displayStreamRef = useRef(null);
  const audioCtxRef = useRef(null);
  const audioSourceRef = useRef("mic");

  // Quiz refs
  const quizIntervalRef = useRef(null);
  const quizAutoCloseRef = useRef(null);
  const quizCountdownRef = useRef(null);
  const quizActiveRef = useRef(false);
  const nextQuizTimerRef = useRef(null);      // countdown "próxima pregunta"
  const firstQuizFiredRef = useRef(false);    // dispara el primer quiz al haber transcript
  const streakRef = useRef(0);
  const maxStreakRef = useRef(0);
  const recentQuestionsRef = useRef([]); // últimas preguntas hechas, para evitar repetición

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

  // Sync streak ref with state
  useEffect(() => {
    streakRef.current = streak;
    if (streak > maxStreakRef.current) maxStreakRef.current = streak;
  }, [streak]);

  useEffect(() => { audioSourceRef.current = audioSource; }, [audioSource]);

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
    setQuizCountdown(null);
    quizActiveRef.current = false;
  }

  // (Re)inicia el ciclo de quiz cada 60s y el contador "próxima pregunta"
  function startQuizTimer() {
    clearInterval(quizIntervalRef.current);
    clearInterval(nextQuizTimerRef.current);

    setNextQuizIn(QUIZ_INTERVAL / 1000);
    nextQuizTimerRef.current = setInterval(() => {
      setNextQuizIn((s) => (s === null ? null : s > 1 ? s - 1 : QUIZ_INTERVAL / 1000));
    }, 1000);

    quizIntervalRef.current = setInterval(() => {
      if (!quizActiveRef.current) {
        setNextQuizIn(QUIZ_INTERVAL / 1000);
        triggerQuiz();
      }
    }, QUIZ_INTERVAL);
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
    if (!streamRef.current || streamRef.current.getTracks().every(t => t.readyState === "ended")) return;

    const chunks = [];
    // Detect best supported MIME type (Safari doesn't support audio/webm)
    const mimeType = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
      "audio/mp4",
      "",
    ].find((t) => !t || MediaRecorder.isTypeSupported(t)) ?? "";
    const recorder = new MediaRecorder(
      streamRef.current,
      mimeType ? { mimeType } : {}
    );
    mediaRecorderRef.current = recorder;

    recorder.addEventListener("dataavailable", (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    });

    recorder.addEventListener("stop", async () => {
      if (chunks.length > 0) {
        chunkCountRef.current += 1;
        const actualMime = recorder.mimeType || mimeType || "audio/webm";
        const ext = actualMime.includes("mp4") ? "mp4"
                  : actualMime.includes("ogg") ? "ogg"
                  : "webm";
        const blob = new Blob(chunks, { type: actualMime });
        const formData = new FormData();
        formData.append("audio", blob, `chunk.${ext}`);
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
            // Primer quiz en cuanto haya suficiente transcript: no esperar a los conceptos
            if (!firstQuizFiredRef.current && wordCount(transcriptRef.current) >= QUIZ_MIN_WORDS) {
              firstQuizFiredRef.current = true;
              triggerQuiz();
              startQuizTimer();
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

  async function startRecording(srcOverride) {
    const src = srcOverride !== undefined ? srcOverride : audioSourceRef.current;
    try {
      let finalStream;

      if (src === "mic") {
        finalStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = finalStream;

      } else if (src === "system") {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: { suppressLocalAudioPlayback: false, echoCancellation: false, noiseSuppression: false },
        });
        displayStream.getVideoTracks().forEach((t) => t.stop());
        const audioTracks = displayStream.getAudioTracks();
        if (!audioTracks.length) {
          displayStream.getTracks().forEach((t) => t.stop());
          showToast("No se capturó audio. Al compartir, selecciona una pestaña y activa «Compartir audio de la pestaña».");
          return;
        }
        displayStreamRef.current = displayStream;
        finalStream = new MediaStream(audioTracks);
        streamRef.current = finalStream;

      } else {
        // "both" src — micrófono + audio del sistema, mezclados
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

      // El ciclo de quiz arranca en cuanto haya suficiente transcript (ver scheduleChunk / startQuizTimer)
    } catch (err) {
      showToast("No se pudo acceder al audio: " + err.message);
    }
  }

  function stopRecording() {
    isRecordingRef.current = false;
    clearTimeout(chunkTimerRef.current);
    clearInterval(quizIntervalRef.current);
    clearInterval(nextQuizTimerRef.current);
    setNextQuizIn(null);
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

  function handleMicMainClick() {
    if (recording) {
      stopRecording();
      setMicExpanded(false);
    } else {
      setMicExpanded(prev => !prev);
      if (camExpanded) setCamExpanded(false);
    }
  }

  async function handleMicOption(key) {
    setAudioSource(key);
    audioSourceRef.current = key;
    setMicExpanded(false);
    await startRecording(key);
  }

  function handleCamMainClick() {
    setCamExpanded(prev => !prev);
    if (micExpanded) setMicExpanded(false);
  }

  // Cada opción dispara el análisis real con Groq Vision (captureScreen/openCamera/
  // handleImageFile, definidas más abajo) en vez de solo mostrar la imagen sin procesar.
  async function handleCamOption(key) {
    setVisualSource(key);
    setCamExpanded(false);
    if (key === "screenshot") {
      await captureScreen();
    } else if (key === "camera") {
      await openCamera();
    } else if (key === "upload") {
      fileInputRef.current?.click();
    }
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

  async function triggerQuiz() {
    if (quizActiveRef.current) return;
    const transcript = (transcriptRef.current || "").trim();
    if (wordCount(transcript) < QUIZ_MIN_WORDS) return; // aún no hay de qué preguntar
    quizActiveRef.current = true;
    try {
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          concepts: conceptsRef.current.slice(-4),
          transcript: transcript.slice(-1500),
          recent_questions: recentQuestionsRef.current,
        }),
      });
      const json = await res.json();
      if (json.skip || !json.question) {
        quizActiveRef.current = false;
        return;
      }
      recentQuestionsRef.current = [...recentQuestionsRef.current, json.question].slice(-5);
      setQuiz(json);
      setQuizAnswer(null);
      // Auto-close sin respuesta tras 30s
      startQuizAutoClose(30, () => {
        quizActiveRef.current = false;
        setQuiz(null);
        setQuizAnswer(null);
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
        ? `+${pts} pts · racha ×${multiplier}`
        : `+${pts} pts`;
      setScoreFlash(flashMsg);
      setTimeout(() => setScoreFlash(null), 2000);
    } else {
      setStreak(0);
    }

    // Auto-cierre del resultado tras unos segundos (feedback ya es corto)
    quizAutoCloseRef.current = setTimeout(() => {
      closeQuiz();
    }, QUIZ_RESULT_DELAY);
  }

  async function uploadPDF(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const formData = new FormData();
    formData.append("pdf", file);
    setPdfUploading(true);
    try {
      const res = await fetch("/api/upload-material", { method: "POST", body: formData });
      const json = await res.json();
      if (!json.skip && json.summary) {
        setMaterialSummary(json.summary);
        showToast(`PDF «${file.name}» listo: el chatbot ya puede usarlo.`, "success");
      } else {
        showToast(json.skip ? "El servicio de IA está saturado. Intenta subir el PDF en unos segundos." : "No se pudo procesar el PDF.");
      }
    } catch {
      showToast("No se pudo subir el PDF. Revisa tu conexión.");
    } finally {
      setPdfUploading(false);
    }
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
      showToast("No se pudo acceder a la cámara: " + err.message);
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
      if (json.skip) {
        setFinishing(false);
        showToast("El servicio de IA está saturado. Espera unos segundos y vuelve a finalizar la clase.");
        return;
      }
      setFinalData({
        ...json,
        score,
        quizStats,
        maxStreak: maxStreakRef.current,
      });
      const canvasNodesResult = await fetchCanvasData();
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
          canvas_nodes: canvasNodesResult,
          score,
          quiz_stats: quizStats,
        },
      }).eq("id", classId);
    } catch (err) {
      console.error("[finish-class]", err);
      setFinishing(false);
      showToast("No se pudo finalizar la clase. Inténtalo de nuevo.");
    }
  }

  async function fetchCanvasData() {
    setCanvasLoading(true);
    setCanvasError(false);
    try {
      const chatHistText = chatHistory.map(c => `${c.role === 'user' ? 'Estudiante' : 'Asistente'}: ${c.text}`).join('\n');
      const conceptNames = conceptsRef.current.map(c => typeof c === 'string' ? c : c.name || c);
      
      const res = await fetch("/api/generate-canvas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: transcriptRef.current,
          material_summary: materialSummary,
          concepts: conceptNames,
          chat_history: chatHistText
        })
      });
      
      if (!res.ok) throw new Error("Error generating canvas");
      const data = await res.json();
      if (data && data.nodes) {
        setCanvasNodes(data.nodes);
        return data.nodes;
      }
      setCanvasError(true);
      return [];
    } catch (err) {
      console.error("Canvas generation error:", err);
      setCanvasError(true);
      return [];
    } finally {
      setCanvasLoading(false);
    }
  }

  const conceptNames = concepts.map((c) => c.name);
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
    return (
      <FinalReport
        canvasError={canvasError}
        canvasLoading={canvasLoading}
        canvasNodes={canvasNodes}
        concepts={concepts}
        downloadTranscript={downloadTranscript}
        elapsed={elapsed}
        fetchCanvasData={fetchCanvasData}
        finalData={finalData}
        isMapFullscreen={isMapFullscreen}
        mapCardRef={mapCardRef}
        materialSummary={materialSummary}
        reportChatEndRef={reportChatEndRef}
        reportChatHistory={reportChatHistory}
        reportChatInput={reportChatInput}
        reportChatLoading={reportChatLoading}
        sendReportChat={sendReportChat}
        setReportChatInput={setReportChatInput}
        toggleMapFullscreen={toggleMapFullscreen}
        transcriptLines={transcriptLines}
      />
    );
  }

  // ─── LIVE CLASS VIEW ───────────────────────────────────────────────────────
  return (
    <div className="class-view" style={{ height: "100vh", display: "flex", flexDirection: "column", background: "var(--bg)", color: "var(--text)", overflow: "hidden" }}>

      {/* Score flash overlay */}
      {scoreFlash && (
        <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 9999, pointerEvents: "none", animation: "scoreFlash 2s ease-out forwards" }}>
          <div style={{ background: "linear-gradient(135deg,#7c6df2,#a78bfa)", borderRadius: 16, padding: "16px 28px", boxShadow: "0 8px 32px rgba(124,108,248,0.5)", textAlign: "center" }}>
            <p style={{ fontSize: "1.8rem", fontWeight: 800, color: "white", margin: 0, letterSpacing: "-0.02em" }}>{scoreFlash}</p>
          </div>
        </div>
      )}

      <LiveHeader
        accuracy={accuracy}
        audioSource={audioSource}
        elapsed={elapsed}
        finishClass={finishClass}
        finishing={finishing}
        materialSummary={materialSummary}
        pdfUploading={pdfUploading}
        quizStats={quizStats}
        recording={recording}
        score={score}
        streak={streak}
        streakMultiplier={streakMultiplier}
        uploadPDF={uploadPDF}
      />

      {/* ── BODY ── */}
      <div className="class-body" style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* 3-column grid */}
        <div className="class-grid">

          <TranscriptPanel
            analyzeLoading={analyzeLoading}
            audioSource={audioSource}
            camExpanded={camExpanded}
            col2Tab={col2Tab}
            conceptNames={conceptNames}
            handleCamMainClick={handleCamMainClick}
            handleCamOption={handleCamOption}
            handleMicMainClick={handleMicMainClick}
            handleMicOption={handleMicOption}
            micExpanded={micExpanded}
            recording={recording}
            setCol2Tab={setCol2Tab}
            transcriptEndRef={transcriptEndRef}
            transcriptLines={transcriptLines}
            visualNotes={visualNotes}
            visualSource={visualSource}
          />

          <ChatPanel
            chatEndRef={chatEndRef}
            chatHistory={chatHistory}
            chatLoading={chatLoading}
            chatQuestion={chatQuestion}
            handleChatSubmit={handleChatSubmit}
            materialSummary={materialSummary}
            sendChatText={sendChatText}
            setChatQuestion={setChatQuestion}
          />

          <RecallPanel
            accuracy={accuracy}
            answerQuiz={answerQuiz}
            closeQuiz={closeQuiz}
            concepts={concepts}
            expandedConcept={expandedConcept}
            getStreakMultiplier={getStreakMultiplier}
            nextQuizIn={nextQuizIn}
            quiz={quiz}
            quizAnswer={quizAnswer}
            quizCountdown={quizCountdown}
            quizStats={quizStats}
            sendChatText={sendChatText}
            setExpandedConcept={setExpandedConcept}
            streak={streak}
            streakMultiplier={streakMultiplier}
          />

        </div>
      </div>

      <input type="file" ref={fileInputRef} accept="image/*" onChange={handleImageFile} style={{ display: "none" }} />

      <Toast
        setToast={setToast}
        toast={toast}
      />

      {/* ── CAMERA MODAL ────────────────────────────────────────────────────── */}
      <CameraModal
        cameraVideoRef={cameraVideoRef}
        captureFromCamera={captureFromCamera}
        closeCamera={closeCamera}
        showCamera={showCamera}
      />

      <LiveStyles />
    </div>
  );
}
