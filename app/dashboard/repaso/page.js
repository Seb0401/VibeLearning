"use client";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import MindMap from "@/components/MindMap";

/* ── Icons ─────────────────────────────────────────────────────────────── */
function Icon({ size = 16, children }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}
const IcoCheck  = ({ s }) => <Icon size={s}><polyline points="20 6 9 17 4 12"/></Icon>;
const IcoRefresh = ({ s }) => <Icon size={s}><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></Icon>;
const IcoZap    = ({ s }) => <Icon size={s}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></Icon>;
const IcoEye    = ({ s }) => <Icon size={s}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></Icon>;
const IcoX      = ({ s }) => <Icon size={s}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></Icon>;

/* ── SM-2 simplified ────────────────────────────────────────────────────── */
const BOX_DAYS = [0, 1, 3, 7, 14, 30];
const STORAGE_KEY = "repaso_v1";

function loadProgress() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; }
}
function saveProgress(p) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}
function isDue(entry) {
  if (!entry) return true;
  return Date.now() >= (entry.nextReview || 0);
}
function nextReviewTime(box) {
  const days = BOX_DAYS[Math.min(box, BOX_DAYS.length - 1)];
  return Date.now() + days * 86400000;
}

/* ── Page ────────────────────────────────────────────────────────────────── */
export default function Repaso() {
  const [allCards, setAllCards]     = useState([]);        // { key, name, summary, classTitle }
  const [progress, setProgress]     = useState({});        // SM-2 state per card key
  const [queue, setQueue]           = useState([]);        // due cards
  const [current, setCurrent]       = useState(null);
  const [phase, setPhase]           = useState("front");   // front | back | reinforcement | done | loading
  const [reinforcement, setReinforcement] = useState("");
  const [loadingReinf, setLoadingReinf]   = useState(false);
  const [sessionStats, setSessionStats]   = useState({ correct: 0, incorrect: 0 });
  const [loading, setLoading]       = useState(true);

  /* Load concepts from Supabase */
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: classes } = await supabase
        .from("classes")
        .select("id, title, data")
        .order("created_at", { ascending: false });

      const cards = [];
      for (const cls of (classes || [])) {
        const concepts = cls.data?.concepts || [];
        for (const c of concepts) {
          const name    = typeof c === "string" ? c : c.name;
          const summary = typeof c === "string" ? "" : (c.summary || "");
          if (!name) continue;
          cards.push({ key: `${cls.id}:${name}`, name, summary, classTitle: cls.title });
        }
      }
      const prog = loadProgress();
      const due  = cards.filter(c => isDue(prog[c.key]));
      setAllCards(cards);
      setProgress(prog);
      setQueue(due);
      setCurrent(due[0] ?? null);
      setPhase(due.length === 0 ? "done" : "front");
      setLoading(false);
    })();
  }, []);

  function rate(rating) {
    // rating: "easy" | "hard" | "miss"
    const prog = loadProgress();
    const entry = prog[current.key] || { box: 0, reviews: 0, correct: 0 };
    const newBox = rating === "easy"
      ? Math.min(entry.box + 2, 5)
      : rating === "hard"
        ? Math.max(entry.box - 0, entry.box + 1 > 5 ? 5 : entry.box + 1)
        : 0;
    const updated = {
      ...entry,
      box: newBox,
      nextReview: nextReviewTime(newBox),
      reviews: entry.reviews + 1,
      correct: entry.correct + (rating !== "miss" ? 1 : 0),
    };
    prog[current.key] = updated;
    saveProgress(prog);
    setProgress({ ...prog });

    const stats = {
      correct: sessionStats.correct + (rating !== "miss" ? 1 : 0),
      incorrect: sessionStats.incorrect + (rating === "miss" ? 1 : 0),
    };
    setSessionStats(stats);

    const remaining = queue.slice(1);
    setQueue(remaining);
    if (remaining.length === 0) { setPhase("done"); setCurrent(null); }
    else { setCurrent(remaining[0]); setPhase("front"); setReinforcement(""); }
  }

  async function getReinforcement() {
    if (!current.summary) { setPhase("back"); return; }
    setLoadingReinf(true);
    try {
      const res  = await fetch("/api/reinforcement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ concept_name: current.name, concept_summary: current.summary }),
      });
      const data = await res.json();
      setReinforcement(data.markdown || "");
    } catch {}
    setLoadingReinf(false);
    setPhase("reinforcement");
  }

  function resetSession() {
    const prog = loadProgress();
    const due  = allCards.filter(c => isDue(prog[c.key]));
    setQueue(due);
    setCurrent(due[0] ?? null);
    setPhase(due.length === 0 ? "done" : "front");
    setReinforcement("");
    setSessionStats({ correct: 0, incorrect: 0 });
  }

  const dueCount  = queue.length;
  const totalDone = sessionStats.correct + sessionStats.incorrect;
  const totalDue  = dueCount + totalDone;
  const pct = totalDue > 0 ? Math.round((totalDone / totalDue) * 100) : 100;

  const masteredCount = Object.values(progress).filter(e => e.box >= 4).length;

  if (loading) {
    return (
      <div style={{ padding: "40px 48px" }}>
        <p style={{ color: "var(--text-2)" }}>Cargando conceptos…</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "40px 48px", maxWidth: 700, display: "flex", flexDirection: "column", gap: 28 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em" }}>
            Repaso espaciado
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-2)", marginTop: 6 }}>
            {allCards.length} conceptos totales · {masteredCount} dominados · {dueCount + totalDone} pendientes hoy
          </p>
        </div>
        {(phase === "done" || totalDone > 0) && (
          <button onClick={resetSession} style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "rgba(255,255,255,0.06)", color: "var(--text-2)",
            border: "1px solid var(--border)", borderRadius: "var(--radius-btn)",
            padding: "9px 16px", fontSize: 13, fontWeight: 500, cursor: "pointer",
          }}>
            <IcoRefresh s={14} /> Reiniciar
          </button>
        )}
      </div>

      {/* Progress bar */}
      {totalDue > 0 && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-3)", marginBottom: 6 }}>
            <span>{totalDone} de {totalDue} completados</span>
            <span style={{ color: pct === 100 ? "var(--green)" : "var(--accent)", fontWeight: 600 }}>{pct}%</span>
          </div>
          <div style={{ height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 99 }}>
            <div style={{
              height: "100%", width: `${pct}%`,
              background: "linear-gradient(90deg, var(--accent), #A78BFA)",
              borderRadius: 99, transition: "width 400ms ease",
            }} />
          </div>
          {totalDone > 0 && (
            <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 12 }}>
              <span style={{ color: "var(--green)" }}>✓ {sessionStats.correct} correctas</span>
              <span style={{ color: "var(--red)" }}>✗ {sessionStats.incorrect} a repasar</span>
            </div>
          )}
        </div>
      )}

      {/* All caught up */}
      {phase === "done" && (
        <div style={{
          background: "var(--card)", border: "1px solid var(--border)",
          borderRadius: "var(--radius-card)", padding: "48px",
          textAlign: "center",
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
          {totalDone > 0 ? (
            <>
              <p style={{ fontWeight: 700, fontSize: 18, color: "var(--text)", marginBottom: 8 }}>
                ¡Sesión completada!
              </p>
              <p style={{ fontSize: 14, color: "var(--text-2)" }}>
                {sessionStats.correct} correctas · {sessionStats.incorrect} para repasar pronto
              </p>
            </>
          ) : (
            <>
              <p style={{ fontWeight: 700, fontSize: 18, color: "var(--text)", marginBottom: 8 }}>
                Estás al día
              </p>
              <p style={{ fontSize: 14, color: "var(--text-2)" }}>
                No hay conceptos pendientes por ahora. Vuelve mañana o completa más clases.
              </p>
            </>
          )}
          {masteredCount > 0 && (
            <p style={{ fontSize: 13, color: "var(--accent)", marginTop: 16, fontWeight: 500 }}>
              {masteredCount} conceptos dominados (intervalo ≥ 14 días)
            </p>
          )}
        </div>
      )}

      {/* Flashcard */}
      {current && phase !== "done" && (
        <div style={{
          background: "var(--card)", border: "1px solid var(--border)",
          borderRadius: "var(--radius-card)", padding: "36px",
          display: "flex", flexDirection: "column", gap: 24,
        }}>
          {/* Card header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{
              fontSize: 11, fontWeight: 600, color: "var(--text-3)",
              letterSpacing: "0.06em", textTransform: "uppercase",
            }}>
              {current.classTitle}
            </span>
            {progress[current.key] && (
              <span style={{
                fontSize: 11, fontWeight: 500, color: "var(--text-3)",
                background: "rgba(255,255,255,0.05)", borderRadius: 99,
                padding: "3px 10px", border: "1px solid var(--border)",
              }}>
                Caja {progress[current.key]?.box ?? 0} / 5
              </span>
            )}
          </div>

          {/* Concept name */}
          <div style={{ textAlign: "center", padding: "12px 0" }}>
            <p style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 10, letterSpacing: "0.04em", textTransform: "uppercase" }}>
              Concepto
            </p>
            <h2 style={{ fontSize: 26, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em", lineHeight: 1.3 }}>
              {current.name}
            </h2>
          </div>

          {/* Front: ask user to recall */}
          {phase === "front" && (
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: 14, color: "var(--text-2)", marginBottom: 20 }}>
                Piensa en qué significa este concepto, luego revela la definición.
              </p>
              <button
                onClick={() => setPhase("back")}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  background: "var(--accent)", color: "white", border: "none",
                  borderRadius: "var(--radius-btn)", padding: "12px 28px",
                  fontSize: 15, fontWeight: 600, cursor: "pointer",
                }}
              >
                <IcoEye s={16} /> Ver definición
              </button>
            </div>
          )}

          {/* Back: show summary + rating */}
          {(phase === "back" || phase === "reinforcement") && (
            <>
              {current.summary && (
                <div style={{
                  background: "rgba(124,108,248,0.08)", border: "1px solid rgba(124,108,248,0.2)",
                  borderRadius: 12, padding: "16px 20px",
                }}>
                  <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.7 }}>
                    {current.summary}
                  </p>
                </div>
              )}

              {/* Reinforcement */}
              {phase === "reinforcement" && reinforcement && (
                <div style={{
                  background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)",
                  borderRadius: 12, padding: "16px 20px",
                }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: "var(--red)", marginBottom: 10, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                    Refuerzo IA
                  </p>
                  <div style={{ overflow: "hidden", maxHeight: 260 }}>
                    <MindMap markdown={reinforcement} />
                  </div>
                </div>
              )}

              {/* Rating buttons */}
              <div>
                <p style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 12, textAlign: "center" }}>
                  ¿Cómo te fue?
                </p>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => { getReinforcement(); rate("miss"); }} disabled={loadingReinf} style={{
                    flex: 1, padding: "12px 8px", border: "1px solid rgba(239,68,68,0.3)",
                    background: "rgba(239,68,68,0.08)", color: "#EF4444",
                    borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  }}>
                    <IcoX s={14} /> No sabía
                  </button>
                  <button onClick={() => rate("hard")} style={{
                    flex: 1, padding: "12px 8px", border: "1px solid rgba(251,191,36,0.3)",
                    background: "rgba(251,191,36,0.08)", color: "#FBBF24",
                    borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  }}>
                    <IcoZap s={14} /> Difícil
                  </button>
                  <button onClick={() => rate("easy")} style={{
                    flex: 1, padding: "12px 8px", border: "1px solid rgba(34,197,94,0.3)",
                    background: "rgba(34,197,94,0.08)", color: "#22C55E",
                    borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  }}>
                    <IcoCheck s={14} /> Fácil
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
