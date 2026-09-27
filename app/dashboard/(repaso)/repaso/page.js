"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useStoredJSON, writeStoredJSON } from "@/lib/useStoredJSON";
import { getSubject } from "@/lib/subject";
import MindMap from "@/components/MindMap";
import Icon, { IconBadge } from "@/components/Icon";
import Mascot from "@/components/Mascot";
import QuizCard from "@/components/QuizCard";

/* ── Repaso espaciado (sistema de cajas de Leitner) ─────────────────────── */
const BOX_DAYS    = [0, 1, 3, 7, 14, 30];
const STORAGE_KEY = "repaso_v1";
const NO_PROGRESS = {};
const QUIZ_LENGTH = 5;

function isDue(entry, now)   { return !entry || now >= (entry.nextReview || 0); }
function nextReviewTime(box) { return Date.now() + BOX_DAYS[Math.min(box, BOX_DAYS.length - 1)] * 86400000; }

function applyRating(progress, key, rating) {
  const entry = progress[key] || { box: 0, reviews: 0, correct: 0 };
  const box = rating === "easy" ? Math.min(entry.box + 2, 5) : rating === "hard" ? Math.min(entry.box + 1, 5) : 0;
  const next = { ...progress, [key]: { ...entry, box, nextReview: nextReviewTime(box), reviews: entry.reviews + 1, correct: entry.correct + (rating !== "miss" ? 1 : 0) } };
  writeStoredJSON(STORAGE_KEY, next);
  return next;
}

/* ── Cabecera de sesión: volver + título + barra "3/10" ─────────────────── */
function SessionHeader({ title, done, total, onBack }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button type="button" onClick={onBack} aria-label="Volver a mis mazos" className="ui-btn ui-btn--ghost ui-btn--sm" style={{ padding: 7 }}>
          <Icon name="arrow-left" size={16} />
        </button>
        <h1 style={{ fontSize: 19, fontWeight: 800, color: "var(--text)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</h1>
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-2)", fontVariantNumeric: "tabular-nums", flexShrink: 0, whiteSpace: "nowrap" }}>{Math.min(done + 1, total)} / {total}</span>
      </div>
      <div className="progress-track"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

/* ── Sesión de flashcards ──────────────────────────────────────────────── */
function FlashcardSession({ deck, progress, setProgress, onExit }) {
  const [now] = useState(() => Date.now());
  const [queue] = useState(() => deck.cards.filter((c) => isDue(progress[c.key], now)));
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [reinforcement, setReinforcement] = useState("");
  const [loadingReinf, setLoadingReinf] = useState(false);
  const [stats, setStats] = useState({ correct: 0, incorrect: 0 });

  const current = queue[index];
  const finished = index >= queue.length;

  function next() { setIndex((i) => i + 1); setFlipped(false); setReinforcement(""); }

  function rate(rating) {
    setProgress(applyRating(progress, current.key, rating));
    setStats((s) => ({ correct: s.correct + (rating !== "miss" ? 1 : 0), incorrect: s.incorrect + (rating === "miss" ? 1 : 0) }));
    next();
  }

  async function missWithReinforcement() {
    setProgress(applyRating(progress, current.key, "miss"));
    setStats((s) => ({ ...s, incorrect: s.incorrect + 1 }));
    if (!current.summary) { next(); return; }
    setLoadingReinf(true);
    try {
      const res = await fetch("/api/reinforcement", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ concept_name: current.name, concept_summary: current.summary }) });
      const data = await res.json();
      setReinforcement(data.markdown || "");
    } catch {}
    setLoadingReinf(false);
  }

  if (queue.length === 0 || finished) {
    const any = stats.correct + stats.incorrect > 0;
    return (
      <SessionEnd
        pose={any ? "celebrando" : "logro"}
        title={any ? "¡Sesión completada!" : "¡Estás al día con este mazo!"}
        text={any ? `${stats.correct} bien · ${stats.incorrect} para repasar pronto` : "No hay tarjetas pendientes. Prueba un quiz o vuelve mañana."}
        onExit={onExit}
      />
    );
  }

  return (
    <div className="session">
      <SessionHeader title={`Repaso de ${deck.title}`} done={index} total={queue.length} onBack={onExit} />

      <div className="flashcard fade-up" key={current.key}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <span className="quiz-chip">Concepto</span>
          <span style={{ fontSize: 11.5, color: "var(--text-3)", fontWeight: 600 }}>{current.classTitle}</span>
        </div>
        <h2 style={{ fontSize: 30, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.02em", textAlign: "center", margin: "28px 0 18px" }}>{current.name}</h2>

        {!flipped ? (
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 14, color: "var(--text-2)", marginBottom: 20 }}>Piensa qué significa y luego revela la definición.</p>
            <button type="button" onClick={() => setFlipped(true)} className="ui-btn ui-btn--primary ui-btn--lg">
              <Icon name="book-open" size={17} /> Ver definición
            </button>
          </div>
        ) : (
          <>
            {current.summary && <div className="flashcard__answer fade-up">{current.summary}</div>}
            {loadingReinf && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center", padding: 12, color: "var(--text-2)", fontSize: 13 }}>
                <span className="spinner" style={{ borderColor: "var(--border-strong)", borderTopColor: "var(--accent)" }} /> Preparando un refuerzo…
              </div>
            )}
            {reinforcement ? (
              <>
                <div style={{ height: 260, borderRadius: 14, overflow: "hidden", border: "1px solid var(--border)", marginTop: 14 }}>
                  <MindMap markdown={reinforcement} />
                </div>
                <button type="button" onClick={next} className="ui-btn ui-btn--primary ui-btn--lg ui-btn--block" style={{ marginTop: 14 }}>
                  Siguiente <Icon name="arrow-right" size={17} />
                </button>
              </>
            ) : !loadingReinf && (
              <>
                <p style={{ fontSize: 12.5, color: "var(--text-3)", textAlign: "center", margin: "18px 0 10px" }}>¿Qué tan bien lo recordaste?</p>
                <div className="rate-row">
                  <button type="button" onClick={missWithReinforcement} className="rate-btn rate-btn--miss"><Icon name="repeat" size={16} /> Otra vez</button>
                  <button type="button" onClick={() => rate("hard")} className="rate-btn rate-btn--hard"><Icon name="zap" size={16} /> Difícil</button>
                  <button type="button" onClick={() => rate("easy")} className="rate-btn rate-btn--easy"><Icon name="check" size={16} /> Fácil</button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ── Sesión de quiz ─────────────────────────────────────────────────────── */
function QuizSession({ deck, progress, setProgress, onExit }) {
  const [question, setQuestion] = useState(null);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [error, setError] = useState("");
  const asked = useRef([]);

  // Pide la pregunta número `index` (se vuelve a pedir si cambia el índice o hay reintento)
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (index >= QUIZ_LENGTH) return;
    let cancelled = false;
    (async () => {
      try {
        const concepts = deck.cards.map((c) => ({ name: c.name, summary: c.summary }));
        const res = await fetch("/api/quiz", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ concepts, recent_questions: asked.current }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (data.skip || !data.question) { setError("El servicio de IA está ocupado. Intenta de nuevo en unos segundos."); return; }
        asked.current = [...asked.current, data.question].slice(-8);
        setQuestion(data);
      } catch {
        if (!cancelled) setError("No se pudo generar la pregunta. Revisa tu conexión.");
      }
    })();
    return () => { cancelled = true; };
  }, [index, attempt, deck]);

  function handleAnswer(ok) {
    if (ok) setScore((s) => s + 1);
    // Refleja el resultado en el repaso espaciado si la pregunta es de un concepto del mazo
    const card = deck.cards.find((c) => c.name.toLowerCase() === (question?.concept || "").toLowerCase());
    if (card) setProgress(applyRating(progress, card.key, ok ? "hard" : "miss"));
  }

  function next() { setQuestion(null); setIndex((i) => i + 1); }

  if (index >= QUIZ_LENGTH) {
    const great = score >= Math.ceil(QUIZ_LENGTH * 0.8);
    return (
      <SessionEnd
        pose={great ? "celebrando" : "tu-puedes"}
        title={great ? "¡Excelente trabajo!" : "¡Buen intento!"}
        text={`Acertaste ${score} de ${QUIZ_LENGTH} preguntas${great ? "." : ". Repasa las flashcards y vuelve a intentarlo."}`}
        onExit={onExit}
        onRetry={() => { setScore(0); setIndex(0); setQuestion(null); }}
      />
    );
  }

  return (
    <div className="session">
      <SessionHeader title={`Quiz de ${deck.title}`} done={index} total={QUIZ_LENGTH} onBack={onExit} />
      {error ? (
        <div className="ui-card" style={{ textAlign: "center", padding: 32 }}>
          <Mascot pose="ayuda" size={120} style={{ margin: "0 auto 10px" }} />
          <p style={{ color: "var(--text-2)", fontSize: 14 }}>{error}</p>
          <button type="button" className="ui-btn ui-btn--primary ui-btn--md" style={{ marginTop: 16 }} onClick={() => { setError(""); setAttempt((a) => a + 1); }}>
            <Icon name="repeat" size={15} /> Reintentar
          </button>
        </div>
      ) : question ? (
        <QuizCard
          key={index}
          question={question}
          onAnswer={handleAnswer}
          onNext={next}
          nextLabel={index + 1 >= QUIZ_LENGTH ? "Ver resultado" : "Siguiente"}
        />
      ) : (
        <div className="ui-card" style={{ textAlign: "center", padding: "36px 20px" }}>
          <Mascot pose="procesando" size={130} float style={{ margin: "0 auto 10px" }} />
          <p style={{ color: "var(--text-2)", fontSize: 14, fontWeight: 600 }}>Preparando la pregunta {index + 1}…</p>
        </div>
      )}
    </div>
  );
}

function SessionEnd({ pose, title, text, onExit, onRetry }) {
  return (
    <div className="session">
      <div className="ui-card fade-up" style={{ textAlign: "center", padding: "40px 24px" }}>
        <Mascot pose={pose} size={170} float style={{ margin: "0 auto 14px" }} />
        <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--text)" }}>{title}</h2>
        <p style={{ fontSize: 14, color: "var(--text-2)", marginTop: 6 }}>{text}</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 22, flexWrap: "wrap" }}>
          {onRetry && <button type="button" className="ui-btn ui-btn--ghost ui-btn--md" onClick={onRetry}><Icon name="repeat" size={15} /> Otra ronda</button>}
          <button type="button" className="ui-btn ui-btn--primary ui-btn--md" onClick={onExit}>Volver a mis mazos</button>
        </div>
      </div>
    </div>
  );
}

/* ── Página ─────────────────────────────────────────────────────────────── */
export default function Repaso() {
  const [classes, setClasses] = useState(null);
  const [view, setView] = useState({ mode: "decks" }); // decks | cards | quiz
  const stored = useStoredJSON(STORAGE_KEY, NO_PROGRESS);
  const [progress, setProgress] = useState(null);
  const prog = progress ?? stored;
  const [now] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;
    createClient().from("classes").select("id, title, data").neq("title", "Clase en progreso...").order("created_at", { ascending: false })
      .then(({ data }) => { if (!cancelled) setClasses(data || []); });
    return () => { cancelled = true; };
  }, []);

  const decks = useMemo(() => {
    if (!classes) return [];
    const perClass = classes.map((c) => ({
      id: c.id,
      title: c.title,
      subject: getSubject(c.title),
      cards: (c.data?.concepts || []).map((concept) => {
        const name = typeof concept === "string" ? concept : concept.name;
        const summary = typeof concept === "string" ? "" : concept.summary || "";
        return name ? { key: `${c.id}:${name}`, name, summary, classTitle: c.title, classId: c.id } : null;
      }).filter(Boolean),
    })).filter((d) => d.cards.length > 0);
    const all = { id: "all", title: "todas mis clases", label: "Todas mis clases", subject: { icon: "cards", color: "#7C6CF8" }, cards: perClass.flatMap((d) => d.cards) };
    return perClass.length > 1 ? [all, ...perClass] : perClass;
  }, [classes]);

  const deck = decks.find((d) => d.id === view.deckId);

  if (!classes) {
    return (
      <div style={{ padding: "40px 48px", display: "flex", justifyContent: "center" }}>
        <Mascot pose="cargando" size={120} float />
      </div>
    );
  }

  if (view.mode === "cards" && deck) return <div className="page-pad"><FlashcardSession deck={deck} progress={prog} setProgress={setProgress} onExit={() => setView({ mode: "decks" })} /></div>;
  if (view.mode === "quiz" && deck)  return <div className="page-pad"><QuizSession deck={deck} progress={prog} setProgress={setProgress} onExit={() => setView({ mode: "decks" })} /></div>;

  const allCards = decks.find((d) => d.id === "all")?.cards || decks.flatMap((d) => d.cards);
  const dueTotal = allCards.filter((c) => isDue(prog[c.key], now)).length;
  const mastered = allCards.filter((c) => prog[c.key]?.box >= 4).length;

  return (
    <div className="page-pad" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.02em" }}>Repasos</h1>
        <p style={{ fontSize: 14, color: "var(--text-2)", marginTop: 4 }}>Flashcards con repaso espaciado y quizzes generados con IA a partir de tus clases.</p>
      </div>

      {decks.length === 0 ? (
        <div className="ui-card" style={{ textAlign: "center", padding: "40px 24px" }}>
          <Mascot pose="idea" size={150} style={{ margin: "0 auto 12px" }} />
          <p style={{ fontWeight: 800, fontSize: 16, color: "var(--text)" }}>Aún no hay tarjetas</p>
          <p style={{ fontSize: 13.5, color: "var(--text-2)", marginTop: 6 }}>Cuando termines una clase, sus conceptos clave aparecerán aquí como mazo.</p>
        </div>
      ) : (
        <>
          <div className="review-summary">
            <div className="review-summary__stat"><span style={{ color: "var(--orange)" }}>{dueTotal}</span> pendientes hoy</div>
            <div className="review-summary__stat"><span style={{ color: "var(--green)" }}>{mastered}</span> dominados</div>
            <div className="review-summary__stat"><span style={{ color: "var(--accent)" }}>{allCards.length}</span> tarjetas en total</div>
            <Mascot pose="idea" size={78} halo={false} style={{ marginLeft: "auto" }} />
          </div>

          <section>
            <h2 style={{ fontSize: 15, fontWeight: 800, color: "var(--text)", marginBottom: 12 }}>Mis mazos</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {decks.map((d) => {
                const due = d.cards.filter((c) => isDue(prog[c.key], now)).length;
                const dom = d.cards.filter((c) => prog[c.key]?.box >= 4).length;
                const seen = d.cards.filter((c) => prog[c.key]?.box >= 1).length;
                const pct = Math.round((seen / d.cards.length) * 100);
                return (
                  <div key={d.id} className="deck-row">
                    <IconBadge name={d.subject.icon} color={d.subject.color} size={48} style={{ borderRadius: 14 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 15, fontWeight: 800, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.label || d.title}</p>
                      <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>
                        {d.cards.length} tarjetas · {due > 0 ? `${due} pendientes` : "al día"}{dom > 0 ? ` · ${dom} dominadas` : ""}
                      </p>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
                        <div className="progress-track" style={{ flex: 1 }}><div className="progress-fill" style={{ width: `${pct}%`, background: d.subject.color }} /></div>
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--text-3)", fontVariantNumeric: "tabular-nums" }}>{seen}/{d.cards.length}</span>
                      </div>
                    </div>
                    <div className="deck-row__actions">
                      <button type="button" className="ui-btn ui-btn--soft ui-btn--sm" onClick={() => setView({ mode: "cards", deckId: d.id })}>
                        <Icon name="cards" size={14} /> Flashcards
                      </button>
                      <button type="button" className="ui-btn ui-btn--ghost ui-btn--sm" onClick={() => setView({ mode: "quiz", deckId: d.id })}>
                        <Icon name="target" size={14} /> Quiz
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
