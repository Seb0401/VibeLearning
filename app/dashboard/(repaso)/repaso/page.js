"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import MindMap from "@/components/MindMap";

function Icon({ size = 16, children }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}
const IcoCheck   = ({ s }) => <Icon size={s}><polyline points="20 6 9 17 4 12"/></Icon>;
const IcoRefresh = ({ s }) => <Icon size={s}><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></Icon>;
const IcoZap     = ({ s }) => <Icon size={s}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></Icon>;
const IcoEye     = ({ s }) => <Icon size={s}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></Icon>;
const IcoX       = ({ s }) => <Icon size={s}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></Icon>;

const BOX_DAYS    = [0, 1, 3, 7, 14, 30];
const STORAGE_KEY = "repaso_v1";

function loadProgress()   { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; } }
function saveProgress(p)  { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); }
function isDue(entry)     { return !entry || Date.now() >= (entry.nextReview || 0); }
function nextReviewTime(box) { return Date.now() + BOX_DAYS[Math.min(box, BOX_DAYS.length - 1)] * 86400000; }

function MiniBar({ label, value, max, color }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-3)" }}>
        <span>{label}</span><span style={{ fontWeight: 600, color }}>{value}</span>
      </div>
      <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 99 }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 99, transition: "width 500ms ease" }} />
      </div>
    </div>
  );
}

export default function Repaso() {
  const [allCards,      setAllCards]      = useState([]);
  const [progress,      setProgress]      = useState({});
  const [queue,         setQueue]         = useState([]);
  const [current,       setCurrent]       = useState(null);
  const [phase,         setPhase]         = useState("front");
  const [reinforcement, setReinforcement] = useState("");
  const [loadingReinf,  setLoadingReinf]  = useState(false);
  const [sessionStats,  setSessionStats]  = useState({ correct: 0, incorrect: 0 });
  const [loading,       setLoading]       = useState(true);
  const [classFilter,   setClassFilter]   = useState(null);
  const [classes,       setClasses]       = useState([]);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: cls } = await supabase.from("classes").select("id, title, data").order("created_at", { ascending: false });
      const cards = [];
      for (const c of (cls || [])) {
        for (const concept of (c.data?.concepts || [])) {
          const name    = typeof concept === "string" ? concept : concept.name;
          const summary = typeof concept === "string" ? "" : (concept.summary || "");
          if (name) cards.push({ key: `${c.id}:${name}`, name, summary, classTitle: c.title, classId: c.id });
        }
      }
      const prog = loadProgress();
      const due  = cards.filter(c => isDue(prog[c.key]));
      setAllCards(cards); setClasses(cls || []); setProgress(prog);
      setQueue(due); setCurrent(due[0] ?? null);
      setPhase(due.length === 0 ? "done" : "front");
      setLoading(false);
    })();
  }, []);

  function applyFilter(classId) {
    setClassFilter(classId);
    const prog = loadProgress();
    const filtered = allCards.filter(c => (!classId || c.classId === classId) && isDue(prog[c.key]));
    setQueue(filtered); setCurrent(filtered[0] ?? null);
    setPhase(filtered.length === 0 ? "done" : "front");
    setReinforcement(""); setSessionStats({ correct: 0, incorrect: 0 });
  }

  function rate(rating) {
    const prog = loadProgress();
    const entry = prog[current.key] || { box: 0, reviews: 0, correct: 0 };
    const newBox = rating === "easy" ? Math.min(entry.box + 2, 5) : rating === "hard" ? Math.min(entry.box + 1, 5) : 0;
    prog[current.key] = { ...entry, box: newBox, nextReview: nextReviewTime(newBox), reviews: entry.reviews + 1, correct: entry.correct + (rating !== "miss" ? 1 : 0) };
    saveProgress(prog); setProgress({ ...prog });
    const stats = { correct: sessionStats.correct + (rating !== "miss" ? 1 : 0), incorrect: sessionStats.incorrect + (rating === "miss" ? 1 : 0) };
    setSessionStats(stats);
    const remaining = queue.slice(1);
    setQueue(remaining);
    if (remaining.length === 0) { setPhase("done"); setCurrent(null); }
    else { setCurrent(remaining[0]); setPhase("front"); setReinforcement(""); }
  }

  async function getReinforcement() {
    if (!current.summary) { rate("miss"); return; }
    setLoadingReinf(true);
    rate("miss");
    try {
      const res  = await fetch("/api/reinforcement", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ concept_name: current.name, concept_summary: current.summary }) });
      const data = await res.json();
      setReinforcement(data.markdown || "");
    } catch {}
    setLoadingReinf(false);
    setPhase("reinforcement");
  }

  function resetSession() {
    const prog = loadProgress();
    const due  = allCards.filter(c => (!classFilter || c.classId === classFilter) && isDue(prog[c.key]));
    setQueue(due); setCurrent(due[0] ?? null);
    setPhase(due.length === 0 ? "done" : "front");
    setReinforcement(""); setSessionStats({ correct: 0, incorrect: 0 });
  }

  const prog          = loadProgress();
  const dueCount      = queue.length;
  const totalDone     = sessionStats.correct + sessionStats.incorrect;
  const totalDue      = dueCount + totalDone;
  const pct           = totalDue > 0 ? Math.round((totalDone / totalDue) * 100) : 100;
  const masteredCount = Object.values(prog).filter(e => e.box >= 4).length;
  const learnedCount  = Object.values(prog).filter(e => e.box >= 1).length;
  const upcomingCards = queue.slice(1, 5);

  if (loading) return <div style={{ padding: "40px 48px" }}><p style={{ color: "var(--text-2)" }}>Cargando…</p></div>;

  return (
    <div style={{ padding: "40px 48px", display: "flex", gap: 28, height: "calc(100vh - 1px)", boxSizing: "border-box" }}>

      {/* ── LEFT: Flashcard ─────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 22, minWidth: 0 }}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em" }}>Repaso espaciado</h1>
            <p style={{ fontSize: 14, color: "var(--text-2)", marginTop: 5 }}>{allCards.length} conceptos · {masteredCount} dominados</p>
          </div>
          {(phase === "done" || totalDone > 0) && (
            <button onClick={resetSession} style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.06)", color: "var(--text-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-btn)", padding: "9px 16px", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
              <IcoRefresh s={14} /> Reiniciar
            </button>
          )}
        </div>

        {totalDue > 0 && (
          <div style={{ flexShrink: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-3)", marginBottom: 6 }}>
              <span>{totalDone} de {totalDue} completados</span>
              <span style={{ color: pct === 100 ? "var(--green)" : "var(--accent)", fontWeight: 600 }}>{pct}%</span>
            </div>
            <div style={{ height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 99 }}>
              <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg, var(--accent), #A78BFA)", borderRadius: 99, transition: "width 400ms ease" }} />
            </div>
            {totalDone > 0 && (
              <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 12 }}>
                <span style={{ color: "var(--green)" }}>✓ {sessionStats.correct} correctas</span>
                <span style={{ color: "var(--red)" }}>✗ {sessionStats.incorrect} a repasar</span>
              </div>
            )}
          </div>
        )}

        {phase === "done" && (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-card)", padding: "56px 48px", textAlign: "center", maxWidth: 460, width: "100%" }}>
              <div style={{ fontSize: 52, marginBottom: 20 }}>🎉</div>
              {totalDone > 0 ? (
                <><p style={{ fontWeight: 700, fontSize: 20, color: "var(--text)", marginBottom: 10 }}>¡Sesión completada!</p>
                <p style={{ fontSize: 14, color: "var(--text-2)" }}>{sessionStats.correct} correctas · {sessionStats.incorrect} a repasar pronto</p></>
              ) : (
                <><p style={{ fontWeight: 700, fontSize: 20, color: "var(--text)", marginBottom: 10 }}>Estás al día</p>
                <p style={{ fontSize: 14, color: "var(--text-2)" }}>No hay pendientes. Vuelve mañana.</p></>
              )}
              {masteredCount > 0 && <p style={{ fontSize: 13, color: "var(--accent)", fontWeight: 600, marginTop: 16 }}>{masteredCount} conceptos dominados (≥14 días)</p>}
            </div>
          </div>
        )}

        {current && phase !== "done" && (
          <div style={{ flex: 1, background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-card)", padding: "36px 40px", display: "flex", flexDirection: "column", gap: 24, overflow: "auto", minHeight: 0 }}>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", letterSpacing: "0.06em", textTransform: "uppercase" }}>{current.classTitle}</span>
              {prog[current.key] && (
                <span style={{ fontSize: 11, color: "var(--text-3)", background: "rgba(255,255,255,0.05)", borderRadius: 99, padding: "3px 10px", border: "1px solid var(--border)" }}>
                  Caja {prog[current.key]?.box ?? 0} / 5
                </span>
              )}
            </div>

            <div style={{ textAlign: "center", padding: "12px 0", flex: phase === "front" ? 1 : 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <p style={{ fontSize: 11, color: "var(--text-3)", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 14 }}>Concepto</p>
              <h2 style={{ fontSize: 28, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em", lineHeight: 1.3 }}>{current.name}</h2>
            </div>

            {phase === "front" && (
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 14, color: "var(--text-2)", marginBottom: 24 }}>Recuerda qué significa, luego revela la definición.</p>
                <button onClick={() => setPhase("back")} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "var(--accent)", color: "white", border: "none", borderRadius: "var(--radius-btn)", padding: "13px 32px", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
                  <IcoEye s={16} /> Ver definición
                </button>
              </div>
            )}

            {(phase === "back" || phase === "reinforcement") && (
              <>
                {current.summary && (
                  <div style={{ background: "rgba(124,108,248,0.08)", border: "1px solid rgba(124,108,248,0.2)", borderRadius: 12, padding: "18px 22px" }}>
                    <p style={{ fontSize: 14, color: "var(--text-2)", lineHeight: 1.7 }}>{current.summary}</p>
                  </div>
                )}
                {phase === "reinforcement" && reinforcement && (
                  <div style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 12, padding: "16px 20px", flex: 1, minHeight: 180 }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: "var(--red)", marginBottom: 10, letterSpacing: "0.04em", textTransform: "uppercase" }}>Refuerzo IA</p>
                    <MindMap markdown={reinforcement} />
                  </div>
                )}
                {loadingReinf && <div style={{ textAlign: "center", padding: 20 }}><p style={{ fontSize: 13, color: "var(--text-3)" }}>Generando refuerzo…</p></div>}
                {!loadingReinf && (
                  <div>
                    <p style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 12, textAlign: "center" }}>¿Cómo te fue?</p>
                    <div style={{ display: "flex", gap: 10 }}>
                      <button onClick={getReinforcement} style={{ flex: 1, padding: "14px 8px", border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)", color: "#EF4444", borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                        <IcoX s={14} /> No sabía
                      </button>
                      <button onClick={() => rate("hard")} style={{ flex: 1, padding: "14px 8px", border: "1px solid rgba(251,191,36,0.3)", background: "rgba(251,191,36,0.08)", color: "#FBBF24", borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                        <IcoZap s={14} /> Difícil
                      </button>
                      <button onClick={() => rate("easy")} style={{ flex: 1, padding: "14px 8px", border: "1px solid rgba(34,197,94,0.3)", background: "rgba(34,197,94,0.08)", color: "#22C55E", borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                        <IcoCheck s={14} /> Fácil
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* ── RIGHT: Side panel ────────────────────────────────────────────── */}
      <div style={{ width: 272, flexShrink: 0, display: "flex", flexDirection: "column", gap: 14, overflowY: "auto" }}>

        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-card)", padding: "16px 16px 12px" }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 10 }}>Filtrar por clase</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 2, maxHeight: 190, overflowY: "auto" }}>
            <button onClick={() => applyFilter(null)} style={{ textAlign: "left", padding: "7px 10px", borderRadius: 8, border: "none", background: !classFilter ? "var(--accent-dim)" : "transparent", color: !classFilter ? "var(--accent)" : "var(--text-2)", fontSize: 13, fontWeight: !classFilter ? 600 : 400, cursor: "pointer" }}>
              Todas las clases
            </button>
            {classes.map(c => (
              <button key={c.id} onClick={() => applyFilter(c.id)} style={{ textAlign: "left", padding: "7px 10px", borderRadius: 8, border: "none", background: classFilter === c.id ? "var(--accent-dim)" : "transparent", color: classFilter === c.id ? "var(--accent)" : "var(--text-2)", fontSize: 13, fontWeight: classFilter === c.id ? 600 : 400, cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {c.title}
              </button>
            ))}
          </div>
        </div>

        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-card)", padding: "16px" }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 14 }}>Progreso general</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <MiniBar label="Vistos al menos una vez" value={learnedCount}  max={allCards.length} color="#7C6CF8" />
            <MiniBar label="Dominados (≥14 días)"   value={masteredCount} max={allCards.length} color="#22C55E" />
          </div>
          <div style={{ marginTop: 14, padding: "12px 0 0", borderTop: "1px solid var(--border)", display: "flex", gap: 10 }}>
            {[
              { label: "Total",     value: allCards.length, color: "var(--accent)" },
              { label: "Pendientes",value: dueCount,        color: "#FBBF24"       },
              { label: "Dominados", value: masteredCount,   color: "#22C55E"       },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ textAlign: "center", flex: 1 }}>
                <p style={{ fontSize: 18, fontWeight: 700, color, letterSpacing: "-0.02em" }}>{value}</p>
                <p style={{ fontSize: 10, color: "var(--text-3)" }}>{label}</p>
              </div>
            ))}
          </div>
        </div>

        {upcomingCards.length > 0 && (
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-card)", padding: "16px" }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 12 }}>Próximas tarjetas</p>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {upcomingCards.map((c, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: i < upcomingCards.length - 1 ? "1px solid var(--border)" : "none" }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", width: 14, flexShrink: 0 }}>{i + 2}</span>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 500, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</p>
                    <p style={{ fontSize: 10, color: "var(--text-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.classTitle}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
