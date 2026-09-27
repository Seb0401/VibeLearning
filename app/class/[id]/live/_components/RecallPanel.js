"use client";
import AppIcon from "@/components/Icon";
import { CONCEPT_ICONS, QUIZ_RESULT_DELAY } from "./constants";

// Columna 1: Active Recall (quiz) + conceptos clave + progreso.
export default function RecallPanel({ accuracy, answerQuiz, closeQuiz, concepts, expandedConcept, getStreakMultiplier, nextQuizIn, quiz, quizAnswer, quizCountdown, quizStats, sendChatText, setExpandedConcept, streak, streakMultiplier }) {
  return (
    <>
    {/* ── COL 1: ACTIVE RECALL + CONCEPTOS ── */}
    <div style={{ order: 1, borderRight: "1px solid var(--border)", display: "grid", gridTemplateRows: "minmax(220px, 0.9fr) minmax(0, 1.1fr)", overflow: "hidden" }}>
      <section style={{ borderBottom: "1px solid var(--border)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ color: "var(--yellow)", display: "flex" }}><AppIcon name="zap" size={16} /></span>
            <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>Active Recall</span>
          </div>
          {quiz && quizCountdown !== null && quizAnswer === null && (
            <span style={{ color: "var(--text-muted)", fontSize: "0.76rem", fontVariantNumeric: "tabular-nums" }}>{quizCountdown}s</span>
          )}
          {!quiz && nextQuizIn !== null && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "var(--text-muted)", fontSize: "0.76rem", fontVariantNumeric: "tabular-nums" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", display: "inline-block" }} />
              Próxima en {nextQuizIn}s
            </span>
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
                  <span style={{ background: "rgba(249,115,22,0.12)", color: "var(--orange)", fontSize: "0.7rem", borderRadius: 20, padding: "2px 8px", fontWeight: 700 }}>
                    <AppIcon name="flame" size={11} style={{ verticalAlign: "-1px" }} /> ×{streakMultiplier}
                  </span>
                )}
                <span style={{ background: "rgba(251,191,36,0.1)", color: "var(--yellow)", fontSize: "0.7rem", borderRadius: 20, padding: "2px 8px", fontWeight: 600 }}>
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
              {["A", "B", "C"].map((opt) => {
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
                      ? <><AppIcon name="check-circle" size={14} style={{ verticalAlign: "-2px", marginRight: 5 }} />Correcto{streak >= 2 ? ` · racha de ${streak}` : ""}</>
                      : <><AppIcon name="x-circle" size={14} style={{ verticalAlign: "-2px", marginRight: 5 }} />Incorrecto · la correcta era {quiz.correct}</>}
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

            {quizAnswer !== null && quiz.explanation && (
              <p style={{ marginTop: 8, fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.45 }}>
                <AppIcon name="lightbulb" size={13} style={{ verticalAlign: "-2px", marginRight: 5, color: "var(--yellow)" }} />{quiz.explanation}
              </p>
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
                role="button"
                tabIndex={0}
                aria-expanded={isExpanded}
                onClick={() => setExpandedConcept(isExpanded ? null : i)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setExpandedConcept(isExpanded ? null : i); } }}
                className="fade-up"
                style={{ borderRadius: 10, border: `1px solid ${isExpanded ? "var(--accent)" : "var(--border)"}`, background: isExpanded ? "rgba(124,109,242,0.08)" : "var(--surface)", padding: "10px 12px", marginBottom: 8, cursor: "pointer", transition: "border-color 0.15s" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 28, height: 28, borderRadius: 8, background: isExpanded ? "rgba(124,108,248,0.18)" : "rgba(124,108,248,0.1)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><AppIcon name={CONCEPT_ICONS[i % CONCEPT_ICONS.length]} size={15} /></span>
                  <span style={{ flex: 1, fontWeight: 600, fontSize: "0.87rem", color: isExpanded ? "var(--accent)" : "var(--text)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</span>
                  {isExpanded
                    ? <span style={{ color: "var(--accent)", display: "flex", transform: "rotate(-90deg)" }}><AppIcon name="chevron-right" size={15} /></span>
                    : <span style={{ color: "var(--text-3)", display: "flex", transform: "rotate(90deg)" }}><AppIcon name="chevron-right" size={15} /></span>}
                </div>
                {isExpanded && (
                  <div style={{ marginTop: 8 }}>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.81rem", lineHeight: 1.55, marginBottom: 8 }}>{c.summary}</p>
                    <button
                      onClick={(e) => { e.stopPropagation(); sendChatText(`Dame un ejemplo de ${c.name}`); }}
                      style={{ background: "none", border: "1px solid var(--border)", borderRadius: 6, padding: "3px 8px", color: "var(--text-muted)", fontSize: "0.74rem", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                    >
                      <AppIcon name="lightbulb" size={12} /> Ver ejemplo
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ padding: "14px 16px", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 600 }}>Aciertos en active recall</span>
            <span style={{ fontSize: "0.8rem", color: "var(--accent)", fontWeight: 700 }}>{accuracy !== null ? `${accuracy}%` : "—"}</span>
          </div>
          <div style={{ height: 5, background: "var(--border)", borderRadius: 10, overflow: "hidden" }}>
            <div style={{ height: "100%", background: "var(--accent)", width: `${accuracy ?? 0}%`, borderRadius: 10, transition: "width 0.5s" }} />
          </div>
          <p style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginTop: 5 }}>
            {concepts.length} {concepts.length === 1 ? "concepto detectado" : "conceptos detectados"}
            {quizStats.total > 0 ? ` · ${quizStats.correct}/${quizStats.total} respuestas correctas` : " · aún sin preguntas"}
          </p>
        </div>
      </section>
    </div>
    </>
  );
}
