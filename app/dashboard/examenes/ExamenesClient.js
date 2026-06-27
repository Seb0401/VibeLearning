"use client";
import { useState, useRef, useCallback } from "react";

function Svg({ size = 16, children }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">{children}</svg>;
}
const IcoUpload  = ({ s = 16 }) => <Svg size={s}><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></Svg>;
const IcoCheck   = ({ s = 16 }) => <Svg size={s}><polyline points="20 6 9 17 4 12"/></Svg>;
const IcoX       = ({ s = 16 }) => <Svg size={s}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></Svg>;
const IcoHelp    = ({ s = 16 }) => <Svg size={s}><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></Svg>;
const IcoDoc     = ({ s = 16 }) => <Svg size={s}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></Svg>;

function scoreColor(pct) {
  if (pct >= 80) return "#22C55E";
  if (pct >= 60) return "#FBBF24";
  return "#EF4444";
}

function parseGrade(grade) {
  if (!grade) return null;
  const m = grade.match(/(\d+(?:\.\d+)?)\s*[/\/]\s*(\d+(?:\.\d+)?)/);
  if (m) return (parseFloat(m[1]) / parseFloat(m[2])) * 100;
  const p = grade.match(/(\d+(?:\.\d+)?)\s*%/);
  if (p) return parseFloat(p[1]);
  return null;
}

function FileZone({ label, file, onFile, accept, hint }) {
  const [drag, setDrag] = useState(false);
  const ref = useRef(null);

  const onDrop = useCallback(e => {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  }, [onFile]);

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={onDrop}
      onClick={() => ref.current?.click()}
      style={{
        background: drag ? "rgba(124,108,248,0.08)" : "rgba(255,255,255,0.02)",
        border: `1.5px dashed ${drag ? "var(--accent)" : file ? "rgba(34,197,94,0.4)" : "rgba(255,255,255,0.12)"}`,
        borderRadius: 10, padding: "14px 16px",
        cursor: "pointer", transition: "all 180ms",
        display: "flex", alignItems: "center", gap: 12,
      }}
    >
      <input ref={ref} type="file" accept={accept} style={{ display: "none" }} onChange={e => e.target.files[0] && onFile(e.target.files[0])} />
      <div style={{ color: file ? "#22C55E" : "var(--text-3)", flexShrink: 0 }}>
        {file ? <IcoCheck s={18} /> : <IcoDoc s={18} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: file ? "#22C55E" : "var(--text-2)" }}>
          {file ? file.name : label}
        </p>
        {!file && <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>{hint}</p>}
      </div>
      {file && (
        <button onClick={e => { e.stopPropagation(); onFile(null); }} style={{ background: "none", border: "none", color: "var(--text-3)", cursor: "pointer", padding: 2 }}>
          <IcoX s={14} />
        </button>
      )}
    </div>
  );
}

export default function ExamenesClient({ classes }) {
  // Exam file
  const [examFile,    setExamFile]    = useState(null);
  const [examPreview, setExamPreview] = useState(null);

  // Instructor instructions
  const [instrMode,   setInstrMode]   = useState("text"); // "text" | "pdf"
  const [instrText,   setInstrText]   = useState("");
  const [instrPDF,    setInstrPDF]    = useState(null);

  // Metadata
  const [subject,     setSubject]     = useState("");
  const [givenGrade,  setGivenGrade]  = useState("");
  const [classId,     setClassId]     = useState("");

  // State
  const [dragging,    setDragging]    = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [result,      setResult]      = useState(null);
  const [error,       setError]       = useState("");
  const [expandedQ,   setExpandedQ]   = useState(new Set());
  const mainRef = useRef(null);

  function handleExamFile(f) {
    if (!f) { setExamFile(null); setExamPreview(null); return; }
    setExamFile(f);
    setResult(null);
    setError("");
    if (f.type.startsWith("image/")) {
      setExamPreview(URL.createObjectURL(f));
    } else {
      setExamPreview(null);
    }
  }

  const onMainDrop = useCallback(e => {
    e.preventDefault(); setDragging(false);
    handleExamFile(e.dataTransfer.files[0]);
  }, []);

  async function analyze() {
    if (!examFile) return;
    setLoading(true);
    setError("");
    setResult(null);
    setExpandedQ(new Set());

    const form = new FormData();
    form.append("file", examFile);
    if (subject)    form.append("subject",           subject);
    if (givenGrade) form.append("given_grade",       givenGrade);
    if (instrMode === "text" && instrText.trim())
                    form.append("instructions_text", instrText.trim());
    if (instrMode === "pdf" && instrPDF)
                    form.append("instructions_pdf",  instrPDF);

    try {
      const res  = await fetch("/api/analyze-exam", { method: "POST", body: form });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (e) {
      setError(e.message || "Error al analizar el examen");
    } finally {
      setLoading(false);
    }
  }

  function toggleQ(i) {
    setExpandedQ(prev => {
      const n = new Set(prev);
      n.has(i) ? n.delete(i) : n.add(i);
      return n;
    });
  }

  const hasInstr = instrMode === "text" ? instrText.trim().length > 0 : !!instrPDF;

  const gradePct = result ? (
    result.given_grade    ? parseGrade(result.given_grade)    :
    result.score_detected ? parseGrade(result.score_detected) :
    result.total_questions > 0 ? (result.correct / result.total_questions) * 100 : null
  ) : null;
  const mainGrade  = result?.given_grade || result?.score_detected || null;
  const gradeColor = gradePct !== null ? scoreColor(gradePct) : "var(--text)";

  const CORRECT_CT   = result?.questions?.filter(q => q.is_correct === true).length  ?? 0;
  const INCORRECT_CT = result?.questions?.filter(q => q.is_correct === false).length ?? 0;
  const PARTIAL_CT   = result?.questions?.filter(q => q.is_correct === null).length  ?? 0;

  const FIELD_STYLE = {
    width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)",
    borderRadius: 9, padding: "8px 12px", fontSize: 13, color: "var(--text)",
    outline: "none", boxSizing: "border-box", fontFamily: "inherit",
  };

  return (
    <div style={{ display: "flex", gap: 20, flex: 1, minHeight: 0 }}>

      {/* ── Left: upload + config ──────────────────────────────────────── */}
      <div style={{ width: 340, flexShrink: 0, display: "flex", flexDirection: "column", gap: 12, overflowY: "auto" }}>

        {/* Exam upload zone */}
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-card)", overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Examen del estudiante *
            </p>
          </div>
          <div style={{ padding: 14 }}>
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onMainDrop}
              onClick={() => mainRef.current?.click()}
              style={{
                background: dragging ? "rgba(124,108,248,0.08)" : examFile ? "rgba(34,197,94,0.04)" : "rgba(255,255,255,0.02)",
                border: `2px dashed ${dragging ? "var(--accent)" : examFile ? "rgba(34,197,94,0.4)" : "rgba(255,255,255,0.1)"}`,
                borderRadius: 12, padding: examPreview ? "12px" : "28px 20px",
                cursor: "pointer", textAlign: "center", transition: "all 180ms",
              }}
            >
              <input ref={mainRef} type="file" accept="image/*,.pdf" style={{ display: "none" }} onChange={e => handleExamFile(e.target.files[0])} />
              {examPreview ? (
                <div>
                  <img src={examPreview} alt="preview" style={{ maxWidth: "100%", maxHeight: 180, borderRadius: 8, objectFit: "contain" }} />
                  <p style={{ fontSize: 11, color: "#22C55E", marginTop: 8, fontWeight: 600 }}>✓ {examFile.name}</p>
                  <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>Haz clic para cambiar</p>
                </div>
              ) : examFile ? (
                <div>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#22C55E", marginBottom: 4 }}>✓ {examFile.name}</p>
                  <p style={{ fontSize: 11, color: "var(--text-3)" }}>Haz clic para cambiar</p>
                </div>
              ) : (
                <div>
                  <div style={{ display: "flex", justifyContent: "center", color: "var(--text-3)", marginBottom: 12 }}>
                    <IcoUpload s={28} />
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>Arrastra o haz clic</p>
                  <p style={{ fontSize: 11, color: "var(--text-3)" }}>Foto JPG/PNG o archivo PDF</p>
                </div>
              )}
            </div>
            {examFile && (
              <button onClick={() => handleExamFile(null)} style={{ marginTop: 8, width: "100%", background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 8, padding: "6px", fontSize: 12, color: "#EF4444", cursor: "pointer" }}>
                Quitar archivo
              </button>
            )}
          </div>
        </div>

        {/* Professor instructions */}
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-card)", overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Indicaciones del profesor
              </p>
              <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>Opcional — mejora la calificación</p>
            </div>
            {hasInstr && <span style={{ fontSize: 10, background: "rgba(34,197,94,0.1)", color: "#22C55E", borderRadius: 4, padding: "2px 8px", fontWeight: 700 }}>✓ Incluidas</span>}
          </div>
          <div style={{ padding: 14 }}>
            {/* Mode toggle */}
            <div style={{ display: "flex", background: "rgba(255,255,255,0.04)", borderRadius: 9, padding: 3, marginBottom: 12 }}>
              {[{ id: "text", label: "Texto / Pegar" }, { id: "pdf", label: "PDF" }].map(({ id, label }) => (
                <button key={id} onClick={() => setInstrMode(id)} style={{
                  flex: 1, background: instrMode === id ? "var(--accent)" : "transparent",
                  border: "none", borderRadius: 7, padding: "6px",
                  fontSize: 12, fontWeight: instrMode === id ? 700 : 400,
                  color: instrMode === id ? "white" : "var(--text-2)",
                  cursor: "pointer", transition: "all 150ms",
                }}>
                  {label}
                </button>
              ))}
            </div>

            {instrMode === "text" ? (
              <textarea
                value={instrText}
                onChange={e => setInstrText(e.target.value)}
                placeholder={"Pega aquí las indicaciones del examen, rúbrica de calificación, o lo que el profesor pidió.\n\nEjemplo:\n• Pregunta 1 vale 20 pts\n• Se deben mostrar todos los pasos\n• Las respuestas deben estar en cm²"}
                rows={7}
                style={{ ...FIELD_STYLE, resize: "vertical" }}
              />
            ) : (
              <FileZone
                label="PDF con indicaciones"
                file={instrPDF}
                onFile={setInstrPDF}
                accept=".pdf"
                hint="Arrastra o haz clic — rúbrica, enunciado, instrucciones"
              />
            )}
          </div>
        </div>

        {/* Metadata */}
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-card)", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Materia (opcional)</label>
            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Ej. Cálculo diferencial" style={{ ...FIELD_STYLE, marginTop: 6 }} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Nota obtenida (opcional)</label>
            <input value={givenGrade} onChange={e => setGivenGrade(e.target.value)} placeholder="Ej.  8/10  ·  85%  ·  B+" style={{ ...FIELD_STYLE, marginTop: 6 }} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Vincular a clase (opcional)</label>
            <select value={classId} onChange={e => setClassId(e.target.value)} style={{ ...FIELD_STYLE, marginTop: 6 }}>
              <option value="">— Sin vincular —</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>
        </div>

        {/* Analyze button */}
        <button
          onClick={analyze}
          disabled={!examFile || loading}
          style={{
            width: "100%", background: examFile && !loading ? "var(--accent)" : "rgba(124,108,248,0.2)",
            color: "white", border: "none", borderRadius: 12,
            padding: "14px", fontSize: 14, fontWeight: 700,
            cursor: !examFile || loading ? "not-allowed" : "pointer",
            opacity: !examFile ? 0.4 : 1, transition: "all 150ms",
          }}
        >
          {loading
            ? "Analizando…"
            : examFile
              ? `Analizar examen${hasInstr ? " + indicaciones" : ""}`
              : "Sube un examen para analizar"}
        </button>

        {error && (
          <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "12px 14px" }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: "#EF4444", marginBottom: 4 }}>Error al analizar</p>
            <p style={{ fontSize: 12, color: "#EF4444", opacity: 0.8 }}>{error}</p>
          </div>
        )}
      </div>

      {/* ── Right: results ──────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>

        {loading && (
          <div style={{ flex: 1, minHeight: 300, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-card)" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 14 }}>🔍</div>
              <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>Analizando tu examen…</p>
              <p style={{ fontSize: 13, color: "var(--text-2)" }}>
                {hasInstr ? "Calificando con las indicaciones del profesor" : "Leyendo cada pregunta y respuesta"}
              </p>
            </div>
          </div>
        )}

        {!result && !loading && (
          <div style={{ flex: 1, minHeight: 300, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-card)" }}>
            <div style={{ textAlign: "center", maxWidth: 380, padding: "0 20px" }}>
              <div style={{ fontSize: 44, marginBottom: 16 }}>📋</div>
              <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", marginBottom: 10 }}>
                Sube tu examen para analizarlo
              </p>
              <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.7 }}>
                La IA identificará cada pregunta, evaluará si las respuestas son correctas y te explicará los errores. Si el examen no incluye las indicaciones, puedes pegarlas a la izquierda para una calificación más precisa.
              </p>
              <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 20, flexWrap: "wrap" }}>
                {["Foto de examen", "PDF escaneado", "Con rúbrica", "Con nota real"].map(t => (
                  <span key={t} style={{ background: "rgba(124,108,248,0.08)", border: "1px solid rgba(124,108,248,0.15)", borderRadius: 99, padding: "4px 12px", fontSize: 11, color: "var(--accent)", fontWeight: 500 }}>{t}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        {result && !loading && (
          <>
            {/* Score card */}
            <div style={{ background: "var(--card)", border: `1px solid ${gradeColor}30`, borderRadius: "var(--radius-card)", padding: "22px 26px", display: "flex", gap: 24, alignItems: "center", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: gradeColor }} />

              <div style={{ textAlign: "center", flexShrink: 0, minWidth: 100 }}>
                <div style={{ fontSize: 48, fontWeight: 900, color: gradeColor, letterSpacing: "-0.04em", lineHeight: 1 }}>
                  {mainGrade || (result.total_questions > 0 ? `${result.correct}/${result.total_questions}` : "—")}
                </div>
                {gradePct !== null && <div style={{ fontSize: 13, color: "var(--text-3)", marginTop: 4 }}>{Math.round(gradePct)}%</div>}
                {result.given_grade && result.score_detected && result.score_detected !== result.given_grade && (
                  <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>Detectada: {result.score_detected}</div>
                )}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 18, marginBottom: 12 }}>
                  {[
                    { l: "Correctas",       v: CORRECT_CT,   c: "#22C55E" },
                    { l: "Incorrectas",     v: INCORRECT_CT, c: "#EF4444" },
                    { l: "Sin determinar",  v: PARTIAL_CT,   c: "var(--text-3)" },
                  ].map(({ l, v, c }) => (
                    <div key={l} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 20, fontWeight: 700, color: c }}>{v}</span>
                      <span style={{ fontSize: 11, color: "var(--text-3)" }}>{l}</span>
                    </div>
                  ))}
                </div>
                {result.total_questions > 0 && (
                  <div style={{ height: 6, background: "rgba(255,255,255,0.07)", borderRadius: 99, marginBottom: 12 }}>
                    <div style={{ height: "100%", width: `${(CORRECT_CT / result.total_questions) * 100}%`, background: gradeColor, borderRadius: 99 }} />
                  </div>
                )}
                <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.65 }}>{result.overall_feedback}</p>
              </div>
            </div>

            {/* Topics to review */}
            {result.topics_to_review?.length > 0 && (
              <div style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: "var(--radius-card)", padding: "14px 18px" }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#EF4444", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
                  Temas a repasar
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {result.topics_to_review.map((t, i) => (
                    <span key={i} style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 99, padding: "4px 12px", fontSize: 12, fontWeight: 500, color: "#EF4444" }}>{t}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Questions */}
            <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-card)", overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>
                  Preguntas ({result.questions?.length || 0})
                </p>
                <button
                  onClick={() => setExpandedQ(expandedQ.size === 0 ? new Set(result.questions.map((_, i) => i)) : new Set())}
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", borderRadius: 7, padding: "5px 12px", fontSize: 12, color: "var(--text-2)", cursor: "pointer" }}
                >
                  {expandedQ.size === 0 ? "Expandir todo" : "Colapsar todo"}
                </button>
              </div>

              {(result.questions || []).map((q, i) => {
                const isExp = expandedQ.has(i);
                const st = q.is_correct === true
                  ? { Icon: IcoCheck, color: "#22C55E", bg: "rgba(34,197,94,0.08)", badge: "CORRECTA",   badgeBg: "rgba(34,197,94,0.1)",   badgeColor: "#22C55E" }
                  : q.is_correct === false
                    ? { Icon: IcoX,     color: "#EF4444", bg: "rgba(239,68,68,0.08)",  badge: "INCORRECTA",  badgeBg: "rgba(239,68,68,0.1)",   badgeColor: "#EF4444" }
                    : { Icon: IcoHelp,  color: "#FBBF24", bg: "rgba(251,191,36,0.08)", badge: "PARCIAL",    badgeBg: "rgba(251,191,36,0.1)",  badgeColor: "#FBBF24" };

                return (
                  <div key={i} style={{ borderBottom: i < (result.questions.length - 1) ? "1px solid var(--border)" : "none" }}>
                    <button
                      onClick={() => toggleQ(i)}
                      style={{ width: "100%", background: "none", border: "none", textAlign: "left", cursor: "pointer", padding: "13px 18px", display: "flex", alignItems: "flex-start", gap: 12 }}
                    >
                      <div style={{ width: 26, height: 26, borderRadius: "50%", background: st.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                        <st.Icon s={13} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)" }}>Pregunta {q.number}</span>
                          <span style={{ fontSize: 10, background: st.badgeBg, color: st.badgeColor, borderRadius: 4, padding: "1px 6px", fontWeight: 700 }}>{st.badge}</span>
                        </div>
                        <p style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.5, margin: 0 }}>{q.question}</p>
                      </div>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2" style={{ flexShrink: 0, transform: isExp ? "rotate(90deg)" : "none", transition: "transform 150ms", marginTop: 6 }}>
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                    </button>

                    {isExp && (
                      <div style={{ padding: "2px 18px 16px 56px", display: "flex", flexDirection: "column", gap: 8 }}>
                        {q.student_answer && (
                          <div style={{ background: q.is_correct === false ? "rgba(239,68,68,0.05)" : "rgba(255,255,255,0.02)", border: `1px solid ${q.is_correct === false ? "rgba(239,68,68,0.15)" : "var(--border)"}`, borderRadius: 9, padding: "10px 14px" }}>
                            <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>Respuesta del estudiante</p>
                            <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.55 }}>{q.student_answer}</p>
                          </div>
                        )}
                        {q.correct_answer && (
                          <div style={{ background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.15)", borderRadius: 9, padding: "10px 14px" }}>
                            <p style={{ fontSize: 10, fontWeight: 700, color: "#22C55E", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>Respuesta correcta</p>
                            <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.55 }}>{q.correct_answer}</p>
                          </div>
                        )}
                        {q.feedback && (
                          <div style={{ background: "rgba(124,108,248,0.05)", border: "1px solid rgba(124,108,248,0.15)", borderRadius: 9, padding: "10px 14px" }}>
                            <p style={{ fontSize: 10, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>Retroalimentación</p>
                            <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.65 }}>{q.feedback}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
