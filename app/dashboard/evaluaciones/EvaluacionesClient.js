"use client";
import { useState } from "react";

function Icon({ size = 16, children }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}
const IcoCheck  = ({ s }) => <Icon size={s}><polyline points="20 6 9 17 4 12"/></Icon>;
const IcoX      = ({ s }) => <Icon size={s}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></Icon>;
const IcoSpark  = ({ s }) => <Icon size={s}><path d="m12 3-1.9 5.8a2 2 0 0 1-1.287 1.288L3 12l5.8 1.9a2 2 0 0 1 1.288 1.287L12 21l1.9-5.8a2 2 0 0 1 1.287-1.288L21 12l-5.8-1.9a2 2 0 0 1-1.288-1.287Z"/></Icon>;
const IcoRefresh = ({ s }) => <Icon size={s}><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></Icon>;

const OPTION_LABELS = ["A", "B", "C", "D"];

function Spinner() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "60px 0" }}>
      <div style={{
        width: 44, height: 44, border: "3px solid rgba(124,108,248,0.2)",
        borderTop: "3px solid var(--accent)", borderRadius: "50%",
        animation: "spin 0.9s linear infinite",
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <p style={{ fontSize: 14, color: "var(--text-2)" }}>Generando examen con IA…</p>
    </div>
  );
}

export default function EvaluacionesClient({ classes }) {
  const [selectedIds, setSelectedIds]  = useState(new Set(classes.map(c => c.id)));
  const [numQ,        setNumQ]         = useState(5);
  const [phase,       setPhase]        = useState("setup");    // setup | loading | exam | results
  const [questions,   setQuestions]    = useState([]);
  const [answers,     setAnswers]      = useState({});         // { [qIndex]: "A"|"B"|"C"|"D" }
  const [submitted,   setSubmitted]    = useState(false);
  const [error,       setError]        = useState("");

  function toggleClass(id) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function generate() {
    setError("");
    const selected = classes.filter(c => selectedIds.has(c.id));
    const concepts = selected.flatMap(c => c.data?.concepts || []);
    if (concepts.length === 0) { setError("Las clases seleccionadas no tienen conceptos."); return; }

    setPhase("loading");
    try {
      const res  = await fetch("/api/exam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ concepts, num_questions: numQ }),
      });
      const data = await res.json();
      if (data.skip || !data.questions?.length) {
        setError("No se pudo generar el examen. Intenta de nuevo."); setPhase("setup"); return;
      }
      setQuestions(data.questions);
      setAnswers({});
      setSubmitted(false);
      setPhase("exam");
    } catch {
      setError("Error de red. Intenta de nuevo."); setPhase("setup");
    }
  }

  function selectAnswer(qIdx, opt) {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [qIdx]: opt }));
  }

  function submit() {
    if (Object.keys(answers).length < questions.length) {
      setError("Responde todas las preguntas antes de enviar."); return;
    }
    setError("");
    setSubmitted(true);
    setPhase("results");
  }

  const score     = questions.filter((q, i) => answers[i] === q.correct).length;
  const scorePct  = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
  const gradeColor = scorePct >= 80 ? "#22C55E" : scorePct >= 60 ? "#FBBF24" : "#EF4444";

  /* ── Setup ── */
  if (phase === "setup") return (
    <div style={{ padding: "40px 48px", maxWidth: 760, display: "flex", flexDirection: "column", gap: 28 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em" }}>Evaluaciones</h1>
        <p style={{ fontSize: 14, color: "var(--text-2)", marginTop: 6 }}>
          Genera un examen con IA a partir de tus clases.
        </p>
      </div>

      {error && (
        <div style={{
          background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
          borderRadius: 12, padding: "12px 16px", fontSize: 13, color: "#EF4444",
        }}>
          {error}
        </div>
      )}

      {/* Class selector */}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-card)", padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>Selecciona las clases</h2>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setSelectedIds(new Set(classes.map(c => c.id)))}
              style={{ fontSize: 12, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", fontWeight: 500 }}>
              Todas
            </button>
            <button onClick={() => setSelectedIds(new Set())}
              style={{ fontSize: 12, color: "var(--text-3)", background: "none", border: "none", cursor: "pointer" }}>
              Ninguna
            </button>
          </div>
        </div>

        {classes.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--text-3)", textAlign: "center", padding: "20px 0" }}>
            No tienes clases guardadas aún.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 320, overflowY: "auto" }}>
            {classes.map(c => {
              const checked = selectedIds.has(c.id);
              const nConcepts = c.data?.concepts?.length || 0;
              return (
                <label key={c.id} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "10px 12px", borderRadius: 10,
                  background: checked ? "var(--accent-dim)" : "transparent",
                  border: `1px solid ${checked ? "rgba(124,108,248,0.25)" : "transparent"}`,
                  cursor: "pointer", transition: "background 150ms",
                }}>
                  <input
                    type="checkbox" checked={checked}
                    onChange={() => toggleClass(c.id)}
                    style={{ accentColor: "var(--accent)", width: 15, height: 15 }}
                  />
                  <span style={{ flex: 1, fontSize: 14, color: checked ? "var(--text)" : "var(--text-2)", fontWeight: checked ? 500 : 400 }}>
                    {c.title}
                  </span>
                  {nConcepts > 0 && (
                    <span style={{ fontSize: 11, color: "var(--text-3)" }}>{nConcepts} conceptos</span>
                  )}
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* Num questions */}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-card)", padding: 24 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", marginBottom: 14 }}>Número de preguntas</h2>
        <div style={{ display: "flex", gap: 10 }}>
          {[5, 8, 10, 15].map(n => (
            <button key={n} onClick={() => setNumQ(n)} style={{
              flex: 1, padding: "12px 8px", fontSize: 14, fontWeight: 600,
              border: `1px solid ${numQ === n ? "rgba(124,108,248,0.4)" : "var(--border)"}`,
              background: numQ === n ? "var(--accent-dim)" : "rgba(255,255,255,0.03)",
              color: numQ === n ? "var(--accent)" : "var(--text-2)",
              borderRadius: 12, cursor: "pointer",
            }}>
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Generate */}
      <button
        onClick={generate}
        disabled={selectedIds.size === 0}
        className="btn-accent"
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          background: "var(--accent)", color: "white", border: "none",
          borderRadius: "var(--radius-btn)", padding: "14px 24px",
          fontSize: 15, fontWeight: 600, cursor: selectedIds.size === 0 ? "not-allowed" : "pointer",
          opacity: selectedIds.size === 0 ? 0.5 : 1,
        }}
      >
        <IcoSpark s={16} />
        Generar examen con IA
      </button>
    </div>
  );

  /* ── Loading ── */
  if (phase === "loading") return (
    <div style={{ padding: "40px 48px", maxWidth: 760 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em", marginBottom: 32 }}>Evaluaciones</h1>
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-card)" }}>
        <Spinner />
      </div>
    </div>
  );

  /* ── Exam ── */
  if (phase === "exam") return (
    <div style={{ padding: "40px 48px", maxWidth: 760, display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em" }}>Examen</h1>
          <p style={{ fontSize: 14, color: "var(--text-2)", marginTop: 6 }}>
            {Object.keys(answers).length} / {questions.length} respondidas
          </p>
        </div>
        <div style={{ height: 40, width: 40, position: "relative" }}>
          <svg viewBox="0 0 36 36" style={{ transform: "rotate(-90deg)", width: 40, height: 40 }}>
            <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3"/>
            <circle cx="18" cy="18" r="15" fill="none" stroke="var(--accent)" strokeWidth="3"
              strokeDasharray={`${(Object.keys(answers).length / questions.length) * 94.2} 94.2`}
              strokeLinecap="round"/>
          </svg>
        </div>
      </div>

      {error && (
        <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 12, padding: "12px 16px", fontSize: 13, color: "#EF4444" }}>
          {error}
        </div>
      )}

      {questions.map((q, qi) => {
        const answered = answers[qi];
        return (
          <div key={qi} style={{
            background: "var(--card)", border: "1px solid var(--border)",
            borderRadius: "var(--radius-card)", padding: "24px",
          }}>
            <div style={{ display: "flex", gap: 12, marginBottom: 18 }}>
              <span style={{
                width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                background: answered ? "var(--accent-dim)" : "rgba(255,255,255,0.05)",
                color: answered ? "var(--accent)" : "var(--text-3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 700, border: `1px solid ${answered ? "rgba(124,108,248,0.3)" : "var(--border)"}`,
              }}>
                {qi + 1}
              </span>
              <p style={{ fontSize: 15, fontWeight: 500, color: "var(--text)", lineHeight: 1.5, flex: 1 }}>
                {q.question}
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingLeft: 38 }}>
              {OPTION_LABELS.map(opt => (
                <button key={opt} onClick={() => selectAnswer(qi, opt)} style={{
                  textAlign: "left", padding: "11px 16px", borderRadius: 10,
                  border: `1px solid ${answers[qi] === opt ? "rgba(124,108,248,0.5)" : "var(--border)"}`,
                  background: answers[qi] === opt ? "var(--accent-dim)" : "rgba(255,255,255,0.02)",
                  color: answers[qi] === opt ? "var(--accent)" : "var(--text-2)",
                  fontSize: 13, fontWeight: answers[qi] === opt ? 600 : 400,
                  cursor: "pointer", transition: "all 120ms",
                  display: "flex", gap: 10, alignItems: "center",
                }}>
                  <span style={{
                    width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                    border: `1.5px solid ${answers[qi] === opt ? "var(--accent)" : "rgba(255,255,255,0.12)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, fontWeight: 700,
                    color: answers[qi] === opt ? "var(--accent)" : "var(--text-3)",
                  }}>
                    {opt}
                  </span>
                  {q.options[opt]}
                </button>
              ))}
            </div>
          </div>
        );
      })}

      <button onClick={submit} className="btn-accent" style={{
        background: "var(--accent)", color: "white", border: "none",
        borderRadius: "var(--radius-btn)", padding: "14px 24px",
        fontSize: 15, fontWeight: 600, cursor: "pointer",
      }}>
        Enviar examen
      </button>
    </div>
  );

  /* ── Results ── */
  if (phase === "results") return (
    <div style={{ padding: "40px 48px", maxWidth: 760, display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Score card */}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-card)", padding: "32px", textAlign: "center" }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-3)", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 16 }}>
          Resultado
        </p>
        <p style={{ fontSize: 56, fontWeight: 800, color: gradeColor, letterSpacing: "-0.04em", lineHeight: 1 }}>
          {scorePct}%
        </p>
        <p style={{ fontSize: 16, color: "var(--text-2)", marginTop: 10 }}>
          {score} de {questions.length} correctas
        </p>
        <p style={{ fontSize: 13, color: gradeColor, marginTop: 8, fontWeight: 500 }}>
          {scorePct >= 80 ? "¡Excelente! Dominas bien estos conceptos." :
           scorePct >= 60 ? "Bien, pero hay conceptos que reforzar." :
           "Repasa estos temas y vuelve a intentarlo."}
        </p>
      </div>

      {/* Per-question feedback */}
      <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text)" }}>Revisión detallada</h2>
      {questions.map((q, qi) => {
        const userAns = answers[qi];
        const correct = q.correct;
        const isOk    = userAns === correct;
        return (
          <div key={qi} style={{
            background: "var(--card)",
            border: `1px solid ${isOk ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`,
            borderRadius: "var(--radius-card)", padding: "22px 24px",
          }}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 14 }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                background: isOk ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
                color: isOk ? "#22C55E" : "#EF4444",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {isOk ? <IcoCheck s={14} /> : <IcoX s={14} />}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 5 }}>
                  {q.concept}
                </p>
                <p style={{ fontSize: 14, fontWeight: 500, color: "var(--text)", lineHeight: 1.5 }}>{q.question}</p>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingLeft: 40 }}>
              {OPTION_LABELS.map(opt => {
                const isCorrect = opt === correct;
                const isUser    = opt === userAns;
                let bg = "transparent", border = "var(--border)", color = "var(--text-3)";
                if (isCorrect) { bg = "rgba(34,197,94,0.08)"; border = "rgba(34,197,94,0.3)"; color = "#22C55E"; }
                else if (isUser && !isCorrect) { bg = "rgba(239,68,68,0.08)"; border = "rgba(239,68,68,0.3)"; color = "#EF4444"; }
                return (
                  <div key={opt} style={{
                    display: "flex", gap: 10, alignItems: "center",
                    padding: "8px 12px", borderRadius: 9,
                    background: bg, border: `1px solid ${border}`, color,
                    fontSize: 13, fontWeight: isCorrect || isUser ? 600 : 400,
                  }}>
                    <span style={{ fontWeight: 700, flexShrink: 0, fontSize: 11 }}>{opt}</span>
                    <span style={{ flex: 1 }}>{q.options[opt]}</span>
                    {isCorrect && <IcoCheck s={13} />}
                    {isUser && !isCorrect && <IcoX s={13} />}
                  </div>
                );
              })}
            </div>

            {q.explanation && (
              <div style={{
                marginTop: 14, paddingLeft: 40,
                padding: "10px 14px 10px 40px",
                background: "rgba(124,108,248,0.06)", borderRadius: 9,
                borderLeft: "3px solid rgba(124,108,248,0.4)",
              }}>
                <p style={{ fontSize: 12.5, color: "var(--text-2)", lineHeight: 1.65 }}>
                  <span style={{ fontWeight: 600, color: "var(--accent)" }}>Por qué: </span>
                  {q.explanation}
                </p>
              </div>
            )}
          </div>
        );
      })}

      {/* Actions */}
      <div style={{ display: "flex", gap: 12 }}>
        <button onClick={() => { setPhase("exam"); setAnswers({}); setSubmitted(false); }} style={{
          flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          background: "rgba(255,255,255,0.05)", color: "var(--text-2)",
          border: "1px solid var(--border)", borderRadius: "var(--radius-btn)",
          padding: "12px 20px", fontSize: 14, fontWeight: 500, cursor: "pointer",
        }}>
          <IcoRefresh s={15} /> Reintentar mismo examen
        </button>
        <button onClick={() => setPhase("setup")} className="btn-accent" style={{
          flex: 1, background: "var(--accent)", color: "white", border: "none",
          borderRadius: "var(--radius-btn)", padding: "12px 20px",
          fontSize: 14, fontWeight: 600, cursor: "pointer",
        }}>
          Nuevo examen
        </button>
      </div>
    </div>
  );
}
