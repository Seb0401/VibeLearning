"use client";
import { useRef, useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Card from "@/components/Card";
import Button from "@/components/Button";
import MindMap from "@/components/MindMap";
import ReactMarkdown from "react-markdown";

const CHUNK_INTERVAL = 7000;
const WINDOW_CHUNKS = 13;

export default function NewClass() {
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [concepts, setConcepts] = useState([]);
  const [quiz, setQuiz] = useState(null);
  const [quizAnswer, setQuizAnswer] = useState(null);
  const [reinforcement, setReinforcement] = useState(null);
  const [materialSummary, setMaterialSummary] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [chatQuestion, setChatQuestion] = useState("");
  const [chatAnswer, setChatAnswer] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [finalData, setFinalData] = useState(null);

  const mediaRecorderRef = useRef(null);
  const chunkCountRef = useRef(0);
  const transcriptRef = useRef("");
  const conceptsRef = useRef([]);

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  useEffect(() => {
    conceptsRef.current = concepts;
  }, [concepts]);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = recorder;

      recorder.addEventListener("dataavailable", async (e) => {
        if (!e.data || e.data.size === 0) return;
        chunkCountRef.current += 1;

        const formData = new FormData();
        formData.append("audio", e.data, "chunk.webm");
        try {
          const res = await fetch("/api/transcribe", { method: "POST", body: formData });
          const json = await res.json();
          if (json.skip || !json.text) return;
          const newTranscript = transcriptRef.current + " " + json.text;
          setTranscript(newTranscript.trim());

          if (chunkCountRef.current % WINDOW_CHUNKS === 0) {
            fetchConcepts(newTranscript.trim());
          }
        } catch {}
      });

      recorder.start(CHUNK_INTERVAL);
      setRecording(true);
    } catch (err) {
      alert("No se pudo acceder al micrófono: " + err.message);
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current?.stream?.getTracks().forEach((t) => t.stop());
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
      const newConcepts = [...conceptsRef.current, ...json.concepts];
      setConcepts(newConcepts);
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
    if (!quiz) return;
    setQuizAnswer(option);
    if (option !== quiz.correct) {
      try {
        const res = await fetch("/api/reinforcement", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            concept_name: quiz.concept,
            concept_summary: quiz.question,
          }),
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

  async function sendChat(e) {
    e.preventDefault();
    if (!chatQuestion.trim()) return;
    setChatLoading(true);
    setChatAnswer("");
    try {
      const res = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: chatQuestion,
          material_summary: materialSummary,
          transcript: transcriptRef.current,
        }),
      });
      const json = await res.json();
      setChatAnswer(json.answer || "No se pudo responder.");
    } catch {
      setChatAnswer("Error al conectar.");
    } finally {
      setChatLoading(false);
      setChatQuestion("");
    }
  }

  async function finishClass() {
    if (finishing) return;
    setFinishing(true);
    try {
      const res = await fetch("/api/finish-class", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: transcriptRef.current,
          concepts: conceptsRef.current,
        }),
      });
      const json = await res.json();
      if (json.skip) { setFinishing(false); return; }

      setFinalData(json);

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("classes").insert({
          user_id: user.id,
          title: json.title || "Clase sin título",
          data: {
            transcript: transcriptRef.current,
            concepts: conceptsRef.current,
            material_summary: materialSummary,
            final_summary: json.final_summary,
            final_mindmap: json.final_mindmap,
          },
        });
      }
    } catch {
      setFinishing(false);
    }
  }

  if (finalData) {
    return (
      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem 1rem" }}>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 700, marginBottom: "1.5rem", color: "var(--text)" }}>
          {finalData.title}
        </h1>
        <Card style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ fontWeight: 600, marginBottom: "1rem", color: "var(--accent)" }}>Resumen high-yield</h2>
          <div style={{ color: "var(--text)", lineHeight: 1.7 }}>
            <ReactMarkdown>{finalData.final_summary}</ReactMarkdown>
          </div>
        </Card>
        {finalData.final_mindmap && (
          <Card style={{ marginBottom: "1.5rem" }}>
            <h2 style={{ fontWeight: 600, marginBottom: "1rem", color: "var(--accent)" }}>Mapa mental</h2>
            <MindMap markdown={finalData.final_mindmap} />
          </Card>
        )}
        <Button onClick={() => (window.location.href = "/dashboard")}>
          Ir al dashboard
        </Button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "2rem 1rem", position: "relative" }}>
      {/* Header */}
      <div style={{ display: "flex", gap: "1rem", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <h1 style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--text)", flex: 1 }}>
          Nueva clase
        </h1>

        {/* PDF upload */}
        <label style={{ cursor: "pointer" }}>
          <Button variant="ghost" onClick={() => document.getElementById("pdf-input").click()}>
            {materialSummary ? "✓ Material subido" : "Subir PDF"}
          </Button>
          <input id="pdf-input" type="file" accept=".pdf" onChange={uploadPDF} style={{ display: "none" }} />
        </label>

        {recording ? (
          <Button variant="danger" onClick={stopRecording}>■ Detener</Button>
        ) : (
          <Button onClick={startRecording}>● Iniciar clase</Button>
        )}

        <Button variant="ghost" onClick={finishClass} disabled={finishing}>
          {finishing ? "Guardando..." : "Finalizar clase"}
        </Button>
      </div>

      {/* Quiz banner */}
      {quiz && quizAnswer === null && (
        <Card style={{ marginBottom: "1.5rem", borderColor: "var(--accent)" }}>
          <p style={{ fontWeight: 600, marginBottom: "0.75rem", color: "var(--text)" }}>
            Quiz: {quiz.question}
          </p>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {["A", "B", "C"].map((opt) => (
              <Button key={opt} variant="ghost" onClick={() => answerQuiz(opt)}>
                {opt}: {quiz.options[opt]}
              </Button>
            ))}
          </div>
        </Card>
      )}

      {/* Quiz result */}
      {quiz && quizAnswer !== null && (
        <Card
          style={{
            marginBottom: "1.5rem",
            borderColor: quizAnswer === quiz.correct ? "var(--success)" : "var(--error)",
          }}
        >
          <p style={{ color: quizAnswer === quiz.correct ? "var(--success)" : "var(--error)", fontWeight: 600 }}>
            {quizAnswer === quiz.correct ? "✓ Correcto" : `✗ Incorrecto — Respuesta: ${quiz.correct}`}
          </p>
          {reinforcement && (
            <div style={{ marginTop: "1rem" }}>
              <div style={{ color: "var(--text)", lineHeight: 1.6, marginBottom: "0.5rem" }}>
                <ReactMarkdown>{reinforcement}</ReactMarkdown>
              </div>
              <MindMap markdown={reinforcement} />
            </div>
          )}
          <button
            onClick={() => { setQuiz(null); setQuizAnswer(null); setReinforcement(null); }}
            style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", marginTop: "0.75rem", fontSize: "0.85rem" }}
          >
            Cerrar
          </button>
        </Card>
      )}

      {/* Concepts */}
      {concepts.length > 0 && (
        <Card style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ fontWeight: 600, marginBottom: "0.75rem", color: "var(--accent)" }}>
            Conceptos clave
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {concepts.map((c, i) => (
              <div key={i}>
                <span style={{ fontWeight: 600, color: "var(--text)" }}>{c.name}: </span>
                <span style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>{c.summary}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Transcript */}
      <Card>
        <h2 style={{ fontWeight: 600, marginBottom: "0.75rem", color: "var(--accent)" }}>
          Transcripción en vivo
        </h2>
        {recording && (
          <span style={{ fontSize: "0.8rem", color: "var(--success)", marginBottom: "0.5rem", display: "block" }}>
            ● Grabando...
          </span>
        )}
        <p
          style={{
            color: transcript ? "var(--text)" : "var(--text-muted)",
            fontSize: "0.9rem",
            lineHeight: 1.6,
            minHeight: "100px",
            maxHeight: "300px",
            overflowY: "auto",
          }}
        >
          {transcript || "La transcripción aparecerá aquí cuando inicies la clase."}
        </p>
      </Card>

      {/* Floating chatbot */}
      <div style={{ position: "fixed", bottom: "1.5rem", right: "1.5rem", zIndex: 50 }}>
        {chatOpen ? (
          <Card style={{ width: "320px", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <span style={{ fontWeight: 600, color: "var(--accent)" }}>Asistente</span>
              <button
                onClick={() => setChatOpen(false)}
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "1.1rem" }}
              >
                ✕
              </button>
            </div>
            {chatAnswer && (
              <p style={{ color: "var(--text)", fontSize: "0.9rem", lineHeight: 1.5, marginBottom: "0.75rem" }}>
                {chatAnswer}
              </p>
            )}
            <form onSubmit={sendChat} style={{ display: "flex", gap: "0.5rem" }}>
              <input
                value={chatQuestion}
                onChange={(e) => setChatQuestion(e.target.value)}
                placeholder="Pregunta algo..."
                style={{
                  flex: 1,
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  padding: "0.5rem 0.75rem",
                  color: "var(--text)",
                  fontSize: "0.85rem",
                }}
              />
              <Button type="submit" disabled={chatLoading}>
                {chatLoading ? "..." : "→"}
              </Button>
            </form>
          </Card>
        ) : (
          <Button onClick={() => setChatOpen(true)}>💬 Chat</Button>
        )}
      </div>
    </div>
  );
}
