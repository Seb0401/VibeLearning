"use client";
import { useState, useRef, useCallback } from "react";

function Svg({ size = 16, children }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">{children}</svg>;
}
const IcoUpload  = ({ s }) => <Svg size={s}><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></Svg>;
const IcoCheck   = ({ s }) => <Svg size={s}><polyline points="20 6 9 17 4 12"/></Svg>;
const IcoX       = ({ s }) => <Svg size={s}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></Svg>;
const IcoHelp    = ({ s }) => <Svg size={s}><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></Svg>;
const IcoStar    = ({ s }) => <Svg size={s}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></Svg>;

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

export default function ExamenesClient({ classes }) {
  const [file,       setFile]       = useState(null);
  const [preview,    setPreview]    = useState(null); // image preview URL
  const [subject,    setSubject]    = useState("");
  const [givenGrade, setGivenGrade] = useState("");
  const [classId,    setClassId]    = useState("");
  const [dragging,   setDragging]   = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [result,     setResult]     = useState(null);
  const [error,      setError]      = useState("");
  const [expandedQ,  setExpandedQ]  = useState(new Set());
  const inputRef = useRef(null);

  function handleFile(f) {
    if (!f) return;
    setFile(f);
    setResult(null);
    setError("");
    if (f.type.startsWith("image/")) {
      const url = URL.createObjectURL(f);
      setPreview(url);
    } else {
      setPreview(null);
    }
  }

  const onDrop = useCallback(e => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, []);

  async function analyze() {
    if (!file) return;
    setLoading(true);
    setError("");
    setResult(null);

    const form = new FormData();
    form.append("file", file);
    if (subject)    form.append("subject", subject);
    if (givenGrade) form.append("given_grade", givenGrade);

    try {
      const res = await fetch("/api/analyze-exam", { method: "POST", body: form });
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
      if (n.has(i)) n.delete(i); else n.add(i);
      return n;
    });
  }

  // Score calculation
  const gradePct = result ? (
    result.given_grade ? parseGrade(result.given_grade) :
    result.score_detected ? parseGrade(result.score_detected) :
    result.total_questions > 0 ? (result.correct / result.total_questions) * 100 : null
  ) : null;
  const mainGrade  = result?.given_grade || result?.score_detected || null;
  const gradeColor = gradePct !== null ? scoreColor(gradePct) : "var(--text)";

  const CORRECT_CT   = result?.questions?.filter(q => q.is_correct === true).length  ?? 0;
  const INCORRECT_CT = result?.questions?.filter(q => q.is_correct === false).length ?? 0;
  const PARTIAL_CT   = result?.questions?.filter(q => q.is_correct === null).length  ?? 0;

  return (
    <div style={{ display: "flex", gap: 20, flex: 1, minHeight: 0 }}>

      {/* ── Left: upload + config ──────────────────────────────────────── */}
      <div style={{ width: 320, flexShrink: 0, display: "flex", flexDirection: "column", gap: 14 }}>

        {/* Upload zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          style={{
            background: dragging ? "rgba(124,108,248,0.08)" : "var(--card)",
            border: `2px dashed ${dragging ? "var(--accent)" : file ? "rgba(34,197,94,0.4)" : "var(--border)"}`,
            borderRadius: "var(--radius-card)", padding: "28px 20px", textAlign: "center",
            cursor: "pointer", transition: "all 200ms",
          }}
        >
          <input ref={inputRef} type="file" accept="image/*,.pdf" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />

          {preview ? (
            <div>
              <img src={preview} alt="preview" style={{ maxWidth: "100%", maxHeight: 160, borderRadius: 8, objectFit: "contain" }} />
              <p style={{ fontSize: 12, color: "#22C55E", marginTop: 8, fontWeight: 600 }}>{file.name}</p>
            </div>
          ) : file ? (
            <div>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📄</div>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#22C55E" }}>{file.name}</p>
              <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>Haz clic para cambiar</p>
            </div>
          ) : (
            <div>
              <div style={{ color: "var(--text-3)", display: "flex", justifyContent: "center", marginBottom: 12 }}>
                <IcoUpload s={32} />
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>
                Sube tu examen
              </p>
              <p style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.6 }}>
                Arrastra o haz clic para seleccionar.<br/>JPG, PNG o PDF
              </p>
            </div>
          )}
        </div>

        {/* Config fields */}
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-card)", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Materia (opcional)</label>
            <input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Ej. Cálculo diferencial"
              style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: 9, padding: "8px 12px", fontSize: 13, color: "var(--text)", outline: "none", marginTop: 6, boxSizing: "border-box" }}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Nota obtenida (opcional)</label>
            <input
              value={givenGrade}
              onChange={e => setGivenGrade(e.target.value)}
              placeholder="Ej. 8/10  ó  85%  ó  B+"
              style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: 9, padding: "8px 12px", fontSize: 13, color: "var(--text)", outline: "none", marginTop: 6, boxSizing: "border-box" }}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Vincular a clase (opcional)</label>
            <select
              value={classId}
              onChange={e => setClassId(e.target.value)}
              style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: 9, padding: "8px 12px", fontSize: 13, color: "var(--text)", outline: "none", marginTop: 6 }}
            >
              <option value="">— Sin vincular —</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>
        </div>

        {/* Analyze button */}
        <button
          onClick={analyze}
          disabled={!file || loading}
          style={{
            width: "100%", background: file && !loading ? "var(--accent)" : "rgba(124,108,248,0.3)",
            color: "white", border: "none", borderRadius: 12,
            padding: "14px", fontSize: 14, fontWeight: 700,
            cursor: !file || loading ? "not-allowed" : "pointer",
            opacity: !file ? 0.5 : 1,
            transition: "all 150ms",
          }}
        >
          {loading ? "Analizando examen…" : "Analizar examen con IA"}
        </button>

        {error && (
          <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "12px 14px" }}>
            <p style={{ fontSize: 13, color: "#EF4444" }}>{error}</p>
          </div>
        )}
      </div>

      {/* ── Right: results ──────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
        {loading && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-card)", flex: 1, minHeight: 300 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>🔍</div>
              <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>Analizando tu examen…</p>
              <p style={{ fontSize: 13, color: "var(--text-2)" }}>La IA está leyendo cada pregunta y respuesta</p>
            </div>
          </div>
        )}

        {!result && !loading && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-card)", flex: 1, minHeight: 300 }}>
            <div style={{ textAlign: "center", maxWidth: 360 }}>
              <div style={{ fontSize: 44, marginBottom: 16 }}>📋</div>
              <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", marginBottom: 10 }}>Sube tu examen para analizarlo</p>
              <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.7 }}>
                La IA identificará cada pregunta y respuesta, evaluará si son correctas, explicará los errores y te dirá qué temas repasar. Funciona con fotos y PDFs.
              </p>
            </div>
          </div>
        )}

        {result && !loading && (
          <>
            {/* Score header */}
            <div style={{ background: "var(--card)", border: `1px solid ${gradeColor}30`, borderRadius: "var(--radius-card)", padding: "24px 28px", display: "flex", gap: 24, alignItems: "center", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: gradeColor }} />

              {/* Big grade */}
              <div style={{ textAlign: "center", flexShrink: 0 }}>
                <div style={{ fontSize: 52, fontWeight: 900, color: gradeColor, letterSpacing: "-0.04em", lineHeight: 1 }}>
                  {mainGrade || (result.total_questions > 0 ? `${result.correct}/${result.total_questions}` : "—")}
                </div>
                {gradePct !== null && (
                  <div style={{ fontSize: 14, color: "var(--text-3)", marginTop: 4 }}>{Math.round(gradePct)}%</div>
                )}
              </div>

              <div style={{ flex: 1 }}>
                {/* Quick stats */}
                <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
                  {[
                    { label: "Correctas", value: CORRECT_CT, color: "#22C55E" },
                    { label: "Incorrectas", value: INCORRECT_CT, color: "#EF4444" },
                    { label: "Sin determinar", value: PARTIAL_CT, color: "var(--text-3)" },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 18, fontWeight: 700, color }}>{value}</span>
                      <span style={{ fontSize: 11, color: "var(--text-3)" }}>{label}</span>
                    </div>
                  ))}
                </div>
                {/* Score bar */}
                {result.total_questions > 0 && (
                  <div style={{ height: 6, background: "rgba(255,255,255,0.07)", borderRadius: 99, marginBottom: 12 }}>
                    <div style={{ height: "100%", width: `${(CORRECT_CT / result.total_questions) * 100}%`, background: gradeColor, borderRadius: 99 }} />
                  </div>
                )}
                <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.6 }}>{result.overall_feedback}</p>
              </div>
            </div>

            {/* Topics to review */}
            {result.topics_to_review?.length > 0 && (
              <div style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: "var(--radius-card)", padding: "16px 20px" }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: "#EF4444", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Temas a repasar</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {result.topics_to_review.map((t, i) => (
                    <span key={i} style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 99, padding: "4px 12px", fontSize: 12, fontWeight: 500, color: "#EF4444" }}>{t}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Questions */}
            <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-card)", overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)" }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>
                  Preguntas ({result.questions?.length || 0})
                </p>
              </div>
              <div>
                {(result.questions || []).map((q, i) => {
                  const isExp = expandedQ.has(i);
                  const icon = q.is_correct === true
                    ? { Icon: IcoCheck, color: "#22C55E", bg: "rgba(34,197,94,0.08)" }
                    : q.is_correct === false
                      ? { Icon: IcoX, color: "#EF4444", bg: "rgba(239,68,68,0.08)" }
                      : { Icon: IcoHelp, color: "var(--text-3)", bg: "rgba(255,255,255,0.04)" };

                  return (
                    <div key={i} style={{ borderBottom: i < (result.questions.length - 1) ? "1px solid var(--border)" : "none" }}>
                      <button
                        onClick={() => toggleQ(i)}
                        style={{ width: "100%", background: "none", border: "none", textAlign: "left", cursor: "pointer", padding: "14px 20px", display: "flex", alignItems: "flex-start", gap: 12 }}
                      >
                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: icon.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                          <icon.Icon s={14} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: icon.color, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                              Pregunta {q.number}
                            </span>
                            {q.is_correct === true && <span style={{ fontSize: 10, background: "rgba(34,197,94,0.1)", color: "#22C55E", borderRadius: 4, padding: "1px 6px", fontWeight: 700 }}>CORRECTA</span>}
                            {q.is_correct === false && <span style={{ fontSize: 10, background: "rgba(239,68,68,0.1)", color: "#EF4444", borderRadius: 4, padding: "1px 6px", fontWeight: 700 }}>INCORRECTA</span>}
                          </div>
                          <p style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.5, margin: 0 }}>{q.question}</p>
                        </div>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2" style={{ flexShrink: 0, transform: isExp ? "rotate(90deg)" : "none", transition: "transform 150ms" }}>
                          <polyline points="9 18 15 12 9 6"/>
                        </svg>
                      </button>

                      {isExp && (
                        <div style={{ padding: "0 20px 18px 60px", display: "flex", flexDirection: "column", gap: 10 }}>
                          {q.student_answer && (
                            <div style={{ background: q.is_correct === false ? "rgba(239,68,68,0.06)" : "rgba(255,255,255,0.03)", border: `1px solid ${q.is_correct === false ? "rgba(239,68,68,0.15)" : "var(--border)"}`, borderRadius: 10, padding: "10px 14px" }}>
                              <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Respuesta del estudiante</p>
                              <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.5 }}>{q.student_answer}</p>
                            </div>
                          )}
                          {q.correct_answer && (
                            <div style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)", borderRadius: 10, padding: "10px 14px" }}>
                              <p style={{ fontSize: 10, fontWeight: 700, color: "#22C55E", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Respuesta correcta</p>
                              <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.5 }}>{q.correct_answer}</p>
                            </div>
                          )}
                          {q.feedback && (
                            <div style={{ background: "rgba(124,108,248,0.06)", border: "1px solid rgba(124,108,248,0.15)", borderRadius: 10, padding: "10px 14px" }}>
                              <p style={{ fontSize: 10, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Retroalimentación</p>
                              <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.6 }}>{q.feedback}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
