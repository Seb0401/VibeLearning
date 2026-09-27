"use client";
import { useState } from "react";
import Icon from "./Icon";

// Pregunta de opción múltiple al estilo de la nueva UI: opciones A–D en tarjetas,
// recuadro de "¡Correcto!" / "Casi…" con la explicación y botón "Siguiente".
//   question: { concept, question, options: {A, B, C, D?}, correct, explanation }
//   onAnswer(isCorrect, key) se llama una vez al responder; onNext() al pulsar Siguiente.
export default function QuizCard({ question, onAnswer, onNext, nextLabel = "Siguiente", compact = false }) {
  const [selected, setSelected] = useState(null);
  const answered = selected !== null;
  const isCorrect = answered && selected === question.correct;
  const keys = Object.keys(question.options || {});

  function choose(key) {
    if (answered) return;
    setSelected(key);
    onAnswer?.(key === question.correct, key);
  }

  return (
    <div className={`quiz-card${compact ? " quiz-card--compact" : ""}`}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
        <span className="quiz-chip">Pregunta</span>
        {question.concept && <span className="quiz-chip quiz-chip--soft">{question.concept}</span>}
      </div>
      <p className="quiz-question">{question.question}</p>

      <div role="radiogroup" aria-label="Opciones" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {keys.map((key) => {
          const state = !answered ? "" : key === question.correct ? " is-correct" : key === selected ? " is-wrong" : " is-dim";
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={selected === key}
              disabled={answered}
              onClick={() => choose(key)}
              className={`quiz-option${state}`}
            >
              <span className="quiz-option__key">{key}</span>
              <span style={{ flex: 1, textAlign: "left" }}>{question.options[key]}</span>
              {answered && key === question.correct && <Icon name="check-circle" size={20} />}
              {answered && key === selected && key !== question.correct && <Icon name="x-circle" size={20} />}
            </button>
          );
        })}
      </div>

      {answered && (
        <div className={`quiz-feedback fade-up ${isCorrect ? "is-correct" : "is-wrong"}`} role="status">
          <span className="quiz-feedback__icon"><Icon name={isCorrect ? "check" : "x"} size={20} strokeWidth={2.6} /></span>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontWeight: 800, fontSize: 15 }}>{isCorrect ? "¡Correcto!" : "Casi…"}</p>
            <p style={{ fontSize: 13, marginTop: 3, lineHeight: 1.55, color: "var(--text-2)" }}>
              {!isCorrect && <>La respuesta correcta es la <strong>{question.correct}</strong>. </>}
              {question.explanation}
            </p>
          </div>
        </div>
      )}

      {answered && onNext && (
        <button type="button" onClick={onNext} className="ui-btn ui-btn--primary ui-btn--lg ui-btn--block fade-up" style={{ marginTop: 4 }}>
          {nextLabel} <Icon name="arrow-right" size={17} />
        </button>
      )}
    </div>
  );
}
