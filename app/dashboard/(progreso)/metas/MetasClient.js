"use client";
import { useState, useEffect } from "react";
import { IconBadge } from "@/components/Icon";
import { useStoredJSON, writeStoredJSON } from "@/lib/useStoredJSON";
import Mascot from "@/components/Mascot";

function Icon({ size = 16, children }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}
const IcoPlus   = ({ s }) => <Icon size={s}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></Icon>;
const IcoTrash  = ({ s }) => <Icon size={s}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></Icon>;
const IcoCheck  = ({ s }) => <Icon size={s}><polyline points="20 6 9 17 4 12"/></Icon>;
const IcoTarget = ({ s }) => <Icon size={s}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></Icon>;

const STORAGE_KEY = "metas_v1";

const GOAL_TEMPLATES = [
  { type: "clases_semana",  label: "Clases por semana",   unit: "clases",   min: 1, max: 7,   default: 3,  description: "Completa X clases esta semana", icon: "graduation" },
  { type: "conceptos_mes",  label: "Conceptos este mes",  unit: "conceptos",min: 5, max: 200,  default: 30, description: "Aprende X nuevos conceptos este mes", icon: "lightbulb" },
  { type: "pdfs_mes",       label: "Materiales este mes", unit: "PDFs",     min: 1, max: 20,   default: 4,  description: "Sube X PDFs durante clases este mes", icon: "file-text" },
  { type: "racha_dias",     label: "Racha de días",       unit: "días",     min: 3, max: 30,   default: 7,  description: "Estudia X días consecutivos", icon: "flame" },
];

const GOAL_COLORS = {
  clases_semana: { fg: "#7C6CF8", bg: "rgba(124,108,248,0.12)" },
  conceptos_mes: { fg: "#FBBF24", bg: "rgba(251,191,36,0.12)"  },
  pdfs_mes:      { fg: "#60A5FA", bg: "rgba(96,165,250,0.12)"  },
  racha_dias:    { fg: "#F97316", bg: "rgba(249,115,22,0.12)"  },
};

function computeProgress(type, target, stats) {
  const current = { clases_semana: stats.weekClasses, conceptos_mes: stats.monthConcepts, pdfs_mes: stats.monthPdfs, racha_dias: stats.streak }[type] ?? 0;
  return { current, total: target };
}
const NO_GOALS = [];
function saveGoals(g)  { writeStoredJSON(STORAGE_KEY, g); }

export default function MetasClient({ stats }) {
  const goals = useStoredJSON(STORAGE_KEY, NO_GOALS);
  const [adding,    setAdding]    = useState(false);
  const [newType,   setNewType]   = useState(GOAL_TEMPLATES[0].type);
  const [newTarget, setNewTarget] = useState(GOAL_TEMPLATES[0].default);


  function addGoal() {
    const tmpl = GOAL_TEMPLATES.find(t => t.type === newType);
    if (!tmpl) return;
    const updated = [...goals, { id: Date.now(), type: newType, target: newTarget, label: tmpl.label, unit: tmpl.unit, description: tmpl.description, createdAt: new Date().toISOString() }];
    saveGoals(updated); setAdding(false);
  }
  function removeGoal(id) { saveGoals(goals.filter(g => g.id !== id)); }
  function onTemplateChange(type) { setNewType(type); const t = GOAL_TEMPLATES.find(x => x.type === type); if (t) setNewTarget(t.default); }

  const activeGoals    = goals.filter(g => { const { current, total } = computeProgress(g.type, g.target, stats); return current < total; });
  const completedGoals = goals.filter(g => { const { current, total } = computeProgress(g.type, g.target, stats); return current >= total; });

  return (
    <div style={{ padding: "40px 48px", display: "flex", flexDirection: "column", gap: 28, height: "100%", boxSizing: "border-box" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap", flexShrink: 0 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em" }}>Metas</h1>
          <p style={{ fontSize: 14, color: "var(--text-2)", marginTop: 6 }}>Define objetivos y sigue tu progreso automáticamente.</p>
        </div>
        <button onClick={() => setAdding(a => !a)} className="btn-accent" style={{ display: "flex", alignItems: "center", gap: 7, background: "var(--accent)", color: "white", border: "none", borderRadius: "var(--radius-btn)", padding: "10px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          <IcoPlus s={15} /> Nueva meta
        </button>
      </div>

      <div className="split-300" style={{ flex: 1, gap: 24, minHeight: 0 }}>

        {/* LEFT: goals list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20, overflowY: "auto", minWidth: 0 }}>

          {/* Add goal panel */}
          {adding && (
            <div style={{ background: "var(--card)", border: "1px solid rgba(124,108,248,0.35)", borderRadius: "var(--radius-card)", padding: "24px", display: "flex", flexDirection: "column", gap: 16, flexShrink: 0 }}>
              <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>Nueva meta</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {GOAL_TEMPLATES.map(tmpl => (
                  <label key={tmpl.type} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10, background: newType === tmpl.type ? "var(--accent-dim)" : "var(--tint-1)", border: `1px solid ${newType === tmpl.type ? "rgba(124,108,248,0.3)" : "var(--border)"}`, cursor: "pointer" }}>
                    <input type="radio" name="goalType" value={tmpl.type} checked={newType === tmpl.type} onChange={() => onTemplateChange(tmpl.type)} style={{ accentColor: "var(--accent)" }} />
                    <IconBadge name={tmpl.icon} color={GOAL_COLORS[tmpl.type].fg} size={32} />
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>{tmpl.label}</p>
                      <p style={{ fontSize: 11, color: "var(--text-3)" }}>{tmpl.description}</p>
                    </div>
                  </label>
                ))}
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: "var(--text-3)", fontWeight: 500, display: "block", marginBottom: 6 }}>
                    Objetivo ({GOAL_TEMPLATES.find(t => t.type === newType)?.unit})
                  </label>
                  <input type="number" value={newTarget} min={GOAL_TEMPLATES.find(t => t.type === newType)?.min ?? 1} max={GOAL_TEMPLATES.find(t => t.type === newType)?.max ?? 100} onChange={e => setNewTarget(Number(e.target.value))} className="input" style={{ fontSize: 15, fontWeight: 600 }} />
                </div>
                <button onClick={addGoal} className="btn-accent" style={{ background: "var(--accent)", color: "white", border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Guardar</button>
                <button onClick={() => setAdding(false)} className="btn-ghost" style={{ background: "var(--tint-3)", color: "var(--text-2)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 16px", fontSize: 14, cursor: "pointer" }}>Cancelar</button>
              </div>
            </div>
          )}

          {/* Empty state */}
          {goals.length === 0 && !adding && (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-card)", padding: "48px 32px", textAlign: "center", maxWidth: 400, width: "100%" }}>
                <Mascot pose="tu-puedes" size={140} style={{ margin: "0 auto 12px" }} />
                <p style={{ fontWeight: 600, color: "var(--text)", marginBottom: 8, fontSize: 16 }}>Sin metas activas</p>
                <p style={{ fontSize: 14, color: "var(--text-2)", marginBottom: 24 }}>Define una meta y el progreso se calcula automáticamente.</p>
                <button onClick={() => setAdding(true)} className="btn-accent" style={{ background: "var(--accent)", color: "white", border: "none", borderRadius: "var(--radius-btn)", padding: "11px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                  Crear primera meta
                </button>
              </div>
            </div>
          )}

          {/* Active */}
          {activeGoals.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", letterSpacing: "0.06em", textTransform: "uppercase" }}>EN PROGRESO</p>
              {activeGoals.map(g => {
                const { current, total } = computeProgress(g.type, g.target, stats);
                const pct = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
                const col = GOAL_COLORS[g.type] || GOAL_COLORS.clases_semana;
                const tmpl = GOAL_TEMPLATES.find(t => t.type === g.type);
                return (
                  <div key={g.id} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-card)", padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                        <IconBadge name={tmpl?.icon || "target"} color={col.fg} size={40} />
                        <div>
                          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{g.label}</p>
                          <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>Meta: {g.target} {g.unit}</p>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ fontSize: 22, fontWeight: 800, color: col.fg, letterSpacing: "-0.02em" }}>{current}/{total}</span>
                        <button onClick={() => removeGoal(g.id)} aria-label={`Eliminar meta ${g.label}`} title="Eliminar meta" className="link-muted" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", padding: 4 }}><IcoTrash s={14} /></button>
                      </div>
                    </div>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-3)", marginBottom: 5 }}>
                        <span>Progreso</span><span style={{ color: col.fg, fontWeight: 600 }}>{pct}%</span>
                      </div>
                      <div style={{ height: 7, background: "var(--tint-3)", borderRadius: 99 }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: col.fg, borderRadius: 99, transition: "width 600ms ease" }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Completed */}
          {completedGoals.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", letterSpacing: "0.06em", textTransform: "uppercase" }}>COMPLETADAS</p>
              {completedGoals.map(g => {
                const { current, total } = computeProgress(g.type, g.target, stats);
                const tmpl = GOAL_TEMPLATES.find(t => t.type === g.type);
                return (
                  <div key={g.id} style={{ background: "rgba(34,197,94,0.04)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: "var(--radius-card)", padding: "14px 20px", display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(34,197,94,0.12)", color: "var(--green)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <IcoCheck s={15} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{g.label}</p>
                      <p style={{ fontSize: 11, color: "var(--green)", marginTop: 2 }}>{current}/{total} {g.unit} · Meta alcanzada</p>
                    </div>
                    <button onClick={() => removeGoal(g.id)} aria-label={`Eliminar meta ${g.label}`} title="Eliminar meta" className="link-muted" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", padding: 4 }}><IcoTrash s={14} /></button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT: current stats */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, overflowY: "auto" }}>
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-card)", padding: "20px" }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 16 }}>Tu actividad actual</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                { icon: "graduation", label: "Clases esta semana", value: stats.weekClasses,   color: "#7C6CF8", unit: "clases"   },
                { icon: "lightbulb",  label: "Conceptos este mes", value: stats.monthConcepts, color: "var(--yellow)", unit: "conceptos"},
                { icon: "file-text",  label: "PDFs este mes",      value: stats.monthPdfs,     color: "var(--blue)", unit: "PDFs"     },
                { icon: "flame",      label: "Racha actual",       value: stats.streak,        color: "var(--orange)", unit: "días"     },
              ].map(({ icon, label, value, color, unit }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "var(--tint-1)", borderRadius: 12, border: "1px solid var(--border)" }}>
                  <IconBadge name={icon} color={color} size={36} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 11, color: "var(--text-3)" }}>{label}</p>
                    <p style={{ fontSize: 20, fontWeight: 800, color, letterSpacing: "-0.02em" }}>{value} <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-3)" }}>{unit}</span></p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-card)", padding: "20px" }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 14 }}>Ideas de metas</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {GOAL_TEMPLATES.map(tmpl => {
                const col = GOAL_COLORS[tmpl.type];
                return (
                  <button key={tmpl.type} onClick={() => { setNewType(tmpl.type); setNewTarget(tmpl.default); setAdding(true); }} className="chip-btn" style={{ textAlign: "left", background: "var(--tint-1)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px", cursor: "pointer", display: "flex", gap: 10, alignItems: "center", color: "var(--text-3)" }}>
                    <IconBadge name={tmpl.icon} color={col.fg} size={30} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 12, fontWeight: 500, color: "var(--text)" }}>{tmpl.label}</p>
                      <p style={{ fontSize: 10, color: "var(--text-3)" }}>Sugerido: {tmpl.default} {tmpl.unit}</p>
                    </div>
                    <IcoPlus s={13} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
