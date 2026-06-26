"use client";
import { useState, useEffect } from "react";

function Icon({ size = 16, children }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}
const IcoPlus    = ({ s }) => <Icon size={s}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></Icon>;
const IcoTrash   = ({ s }) => <Icon size={s}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></Icon>;
const IcoCheck   = ({ s }) => <Icon size={s}><polyline points="20 6 9 17 4 12"/></Icon>;
const IcoTarget  = ({ s }) => <Icon size={s}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></Icon>;
const IcoFlag    = ({ s }) => <Icon size={s}><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></Icon>;

const STORAGE_KEY = "metas_v1";

const GOAL_TEMPLATES = [
  { type: "clases_semana",    label: "Clases por semana",       unit: "clases",    min: 1,  max: 7,  default: 3,
    description: "Completa X clases esta semana" },
  { type: "conceptos_mes",    label: "Conceptos este mes",      unit: "conceptos", min: 5,  max: 200, default: 30,
    description: "Aprende X nuevos conceptos este mes" },
  { type: "pdfs_mes",         label: "Materiales este mes",     unit: "PDFs",      min: 1,  max: 20,  default: 4,
    description: "Sube X PDFs durante clases este mes" },
  { type: "racha_dias",       label: "Racha de días",           unit: "días",      min: 3,  max: 30,  default: 7,
    description: "Estudia X días consecutivos" },
];

function computeProgress(goalType, target, stats) {
  switch (goalType) {
    case "clases_semana":   return { current: stats.weekClasses,   total: target };
    case "conceptos_mes":   return { current: stats.monthConcepts, total: target };
    case "pdfs_mes":        return { current: stats.monthPdfs,     total: target };
    case "racha_dias":      return { current: stats.streak,        total: target };
    default: return { current: 0, total: target };
  }
}

function loadGoals() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}
function saveGoals(goals) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
}

export default function MetasClient({ stats }) {
  const [goals,      setGoals]      = useState([]);
  const [adding,     setAdding]     = useState(false);
  const [newType,    setNewType]    = useState(GOAL_TEMPLATES[0].type);
  const [newTarget,  setNewTarget]  = useState(GOAL_TEMPLATES[0].default);

  useEffect(() => { setGoals(loadGoals()); }, []);

  function addGoal() {
    const tmpl = GOAL_TEMPLATES.find(t => t.type === newType);
    if (!tmpl) return;
    const goal = {
      id: Date.now(),
      type: newType,
      target: newTarget,
      label: tmpl.label,
      unit: tmpl.unit,
      description: tmpl.description,
      createdAt: new Date().toISOString(),
    };
    const updated = [...goals, goal];
    setGoals(updated);
    saveGoals(updated);
    setAdding(false);
  }

  function removeGoal(id) {
    const updated = goals.filter(g => g.id !== id);
    setGoals(updated);
    saveGoals(updated);
  }

  function onTemplateChange(type) {
    setNewType(type);
    const tmpl = GOAL_TEMPLATES.find(t => t.type === type);
    if (tmpl) setNewTarget(tmpl.default);
  }

  const activeGoals = goals.filter(g => {
    const { current, total } = computeProgress(g.type, g.target, stats);
    return current < total;
  });
  const completedGoals = goals.filter(g => {
    const { current, total } = computeProgress(g.type, g.target, stats);
    return current >= total;
  });

  const GOAL_COLORS = {
    clases_semana:  { fg: "#7C6CF8", bg: "rgba(124,108,248,0.12)" },
    conceptos_mes:  { fg: "#22C55E", bg: "rgba(34,197,94,0.12)"   },
    pdfs_mes:       { fg: "#EF4444", bg: "rgba(239,68,68,0.12)"   },
    racha_dias:     { fg: "#FBBF24", bg: "rgba(251,191,36,0.12)"  },
  };

  return (
    <div style={{ padding: "40px 48px", maxWidth: 800, display: "flex", flexDirection: "column", gap: 28 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em" }}>Metas</h1>
          <p style={{ fontSize: 14, color: "var(--text-2)", marginTop: 6 }}>
            Define objetivos y sigue tu progreso automáticamente.
          </p>
        </div>
        <button onClick={() => setAdding(a => !a)} className="btn-accent" style={{
          display: "flex", alignItems: "center", gap: 7,
          background: "var(--accent)", color: "white", border: "none",
          borderRadius: "var(--radius-btn)", padding: "10px 18px",
          fontSize: 14, fontWeight: 600, cursor: "pointer",
        }}>
          <IcoPlus s={15} /> Nueva meta
        </button>
      </div>

      {/* Stats context strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
        {[
          { label: "Clases esta semana", value: stats.weekClasses,   color: "#7C6CF8" },
          { label: "Conceptos este mes", value: stats.monthConcepts, color: "#22C55E" },
          { label: "PDFs este mes",      value: stats.monthPdfs,     color: "#EF4444" },
          { label: "Racha actual",       value: `${stats.streak}d`,  color: "#FBBF24" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            background: "var(--card)", border: "1px solid var(--border)",
            borderRadius: 12, padding: "14px 16px",
          }}>
            <p style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 4 }}>{label}</p>
            <p style={{ fontSize: 22, fontWeight: 700, color, letterSpacing: "-0.02em" }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Add goal panel */}
      {adding && (
        <div style={{
          background: "var(--card)", border: "1px solid rgba(124,108,248,0.3)",
          borderRadius: "var(--radius-card)", padding: "24px",
          display: "flex", flexDirection: "column", gap: 16,
        }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>Nueva meta</h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ fontSize: 12, color: "var(--text-3)", fontWeight: 500 }}>Tipo de meta</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {GOAL_TEMPLATES.map(tmpl => (
                <label key={tmpl.type} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "10px 14px", borderRadius: 10,
                  background: newType === tmpl.type ? "var(--accent-dim)" : "rgba(255,255,255,0.02)",
                  border: `1px solid ${newType === tmpl.type ? "rgba(124,108,248,0.3)" : "var(--border)"}`,
                  cursor: "pointer",
                }}>
                  <input type="radio" name="goalType" value={tmpl.type}
                    checked={newType === tmpl.type}
                    onChange={() => onTemplateChange(tmpl.type)}
                    style={{ accentColor: "var(--accent)" }}
                  />
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>{tmpl.label}</p>
                    <p style={{ fontSize: 11, color: "var(--text-3)" }}>{tmpl.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, color: "var(--text-3)", fontWeight: 500, display: "block", marginBottom: 6 }}>
                Objetivo ({GOAL_TEMPLATES.find(t => t.type === newType)?.unit})
              </label>
              <input
                type="number"
                value={newTarget}
                min={GOAL_TEMPLATES.find(t => t.type === newType)?.min ?? 1}
                max={GOAL_TEMPLATES.find(t => t.type === newType)?.max ?? 100}
                onChange={e => setNewTarget(Number(e.target.value))}
                style={{
                  width: "100%", background: "rgba(255,255,255,0.05)",
                  border: "1px solid var(--border)", borderRadius: 10,
                  padding: "10px 14px", fontSize: 15, fontWeight: 600,
                  color: "var(--text)", outline: "none", boxSizing: "border-box",
                }}
              />
            </div>
            <div style={{ display: "flex", gap: 8, paddingTop: 24 }}>
              <button onClick={addGoal} style={{
                background: "var(--accent)", color: "white", border: "none",
                borderRadius: 10, padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer",
              }}>
                Guardar
              </button>
              <button onClick={() => setAdding(false)} style={{
                background: "rgba(255,255,255,0.06)", color: "var(--text-2)",
                border: "1px solid var(--border)", borderRadius: 10,
                padding: "10px 16px", fontSize: 14, cursor: "pointer",
              }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {goals.length === 0 && !adding && (
        <div style={{
          background: "var(--card)", border: "1px solid var(--border)",
          borderRadius: "var(--radius-card)", padding: "64px 48px", textAlign: "center",
        }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🎯</div>
          <p style={{ fontWeight: 600, color: "var(--text)", marginBottom: 8, fontSize: 16 }}>
            Sin metas activas
          </p>
          <p style={{ fontSize: 14, color: "var(--text-2)", marginBottom: 24 }}>
            Define una meta y la app calculará tu progreso automáticamente.
          </p>
          <button onClick={() => setAdding(true)} className="btn-accent" style={{
            background: "var(--accent)", color: "white", border: "none",
            borderRadius: "var(--radius-btn)", padding: "11px 24px",
            fontSize: 14, fontWeight: 600, cursor: "pointer",
          }}>
            Crear primera meta
          </button>
        </div>
      )}

      {/* Active goals */}
      {activeGoals.length > 0 && (
        <div>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-2)", marginBottom: 12, letterSpacing: "0.02em" }}>
            EN PROGRESO
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {activeGoals.map(g => {
              const { current, total } = computeProgress(g.type, g.target, stats);
              const pct  = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
              const col  = GOAL_COLORS[g.type] || GOAL_COLORS.clases_semana;
              return (
                <div key={g.id} style={{
                  background: "var(--card)", border: "1px solid var(--border)",
                  borderRadius: "var(--radius-card)", padding: "20px 22px",
                  display: "flex", flexDirection: "column", gap: 12,
                }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: "50%",
                        background: col.bg, color: col.fg,
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      }}>
                        <IcoTarget s={16} />
                      </div>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{g.label}</p>
                        <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>
                          Meta: {g.target} {g.unit}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 20, fontWeight: 800, color: col.fg, letterSpacing: "-0.02em" }}>
                        {current}/{total}
                      </span>
                      <button onClick={() => removeGoal(g.id)} style={{
                        background: "none", border: "none", cursor: "pointer",
                        color: "var(--text-3)", padding: 4,
                      }}>
                        <IcoTrash s={14} />
                      </button>
                    </div>
                  </div>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-3)", marginBottom: 5 }}>
                      <span>Progreso</span>
                      <span style={{ color: col.fg, fontWeight: 600 }}>{pct}%</span>
                    </div>
                    <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 99 }}>
                      <div style={{
                        height: "100%", width: `${pct}%`,
                        background: col.fg, borderRadius: 99,
                        transition: "width 600ms ease",
                      }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Completed goals */}
      {completedGoals.length > 0 && (
        <div>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-2)", marginBottom: 12, letterSpacing: "0.02em" }}>
            COMPLETADAS
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {completedGoals.map(g => {
              const { current, total } = computeProgress(g.type, g.target, stats);
              const col = GOAL_COLORS[g.type] || GOAL_COLORS.clases_semana;
              return (
                <div key={g.id} style={{
                  background: "rgba(34,197,94,0.04)", border: "1px solid rgba(34,197,94,0.2)",
                  borderRadius: "var(--radius-card)", padding: "16px 22px",
                  display: "flex", alignItems: "center", gap: 14,
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%",
                    background: "rgba(34,197,94,0.12)", color: "#22C55E",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    <IcoCheck s={15} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{g.label}</p>
                    <p style={{ fontSize: 11, color: "#22C55E", marginTop: 2 }}>
                      ✓ {current}/{total} {g.unit} — Meta alcanzada
                    </p>
                  </div>
                  <button onClick={() => removeGoal(g.id)} style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: "var(--text-3)", padding: 4,
                  }}>
                    <IcoTrash s={14} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
