import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

/* ── Icons ─────────────────────────────────────────────────────────────── */
function Icon({ size = 16, children }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}
const IcoGradCap  = ({ s }) => <Icon size={s}><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></Icon>;
const IcoZap      = ({ s }) => <Icon size={s}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></Icon>;
const IcoClock    = ({ s }) => <Icon size={s}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></Icon>;
const IcoFileText = ({ s }) => <Icon size={s}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></Icon>;
const IcoTarget   = ({ s }) => <Icon size={s}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></Icon>;
const IcoTrend    = ({ s }) => <Icon size={s}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></Icon>;
const IcoPlay     = ({ s }) => <Icon size={s}><polygon points="5 3 19 12 5 21 5 3"/></Icon>;
const IcoSpark    = ({ s }) => <Icon size={s}><path d="m12 3-1.9 5.8a2 2 0 0 1-1.287 1.288L3 12l5.8 1.9a2 2 0 0 1 1.288 1.287L12 21l1.9-5.8a2 2 0 0 1 1.287-1.288L21 12l-5.8-1.9a2 2 0 0 1-1.288-1.287Z"/></Icon>;

/* ── Helpers ────────────────────────────────────────────────────────────── */
function wordsInTranscript(c) {
  return (c.data?.transcript || "").trim().split(/\s+/).filter(Boolean).length;
}

function fmtHours(h) {
  if (h < 0.017) return "0 min";
  if (h < 1)     return `${Math.round(h * 60)} min`;
  return `${h.toFixed(1)} h`;
}

function getSubjectLabel(title) {
  const t = (title || "").toLowerCase();
  if (t.match(/machine.?learn|neural|deep.?learn|\bml\b|\bia\b|intelig|ai/)) return "IA";
  if (t.match(/cálculo|calculo|ecuaci|integr|derivad|serie|álgebra|algebra|matem/))  return "Matemáticas";
  if (t.match(/base.*dato|sql|database|datos|normaliz/)) return "Bases de datos";
  if (t.match(/program|código|codigo|oop|objeto|herencia|polimorf/)) return "Programación";
  return "General";
}

function subjectColor(label) {
  const MAP = {
    "IA":              { bg: "rgba(96,165,250,0.12)",  fg: "#60A5FA" },
    "Matemáticas":     { bg: "rgba(167,139,250,0.12)", fg: "#A78BFA" },
    "Bases de datos":  { bg: "rgba(34,197,94,0.12)",   fg: "#22C55E" },
    "Programación":    { bg: "rgba(251,191,36,0.12)",  fg: "#FBBF24" },
    "General":         { bg: "rgba(124,108,248,0.12)", fg: "#7C6CF8" },
  };
  return MAP[label] || MAP["General"];
}

/* ── Weekly buckets (last 8 weeks, Mon–Sun) ─────────────────────────────── */
function weeklyActivity(classes) {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const startOfThisWeek = new Date(now);
  startOfThisWeek.setDate(now.getDate() - ((day + 6) % 7)); // Monday
  startOfThisWeek.setHours(0, 0, 0, 0);

  const weeks = Array.from({ length: 8 }, (_, i) => {
    const start = new Date(startOfThisWeek);
    start.setDate(start.getDate() - i * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    const label = i === 0 ? "Esta sem." : i === 1 ? "Sem. pasada" :
      start.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
    return { start, end, label, count: 0 };
  }).reverse();

  for (const c of classes) {
    const t = new Date(c.created_at).getTime();
    for (const w of weeks) {
      if (t >= w.start.getTime() && t < w.end.getTime()) { w.count++; break; }
    }
  }
  return weeks;
}

/* ── Quiz performance ──────────────────────────────────────────────────── */
function quizStats(classes) {
  let total = 0, correct = 0;
  for (const c of classes) {
    const qr = c.data?.quiz_results;
    if (!Array.isArray(qr)) continue;
    for (const q of qr) {
      total++;
      if (q.correct === true || q.wasCorrect === true || q.result === "correct") correct++;
    }
  }
  return { total, correct, pct: total > 0 ? Math.round((correct / total) * 100) : null };
}

/* ── Current streak ─────────────────────────────────────────────────────── */
function currentStreak(classes) {
  if (!classes.length) return 0;
  const days = new Set(
    classes.map(c => {
      const d = new Date(c.created_at);
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    })
  );
  let streak = 0;
  const now = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (days.has(key)) streak++;
    else if (i > 0) break;
  }
  return streak;
}

/* ── Components ─────────────────────────────────────────────────────────── */
function StatCard({ icon, iconBg, iconColor, label, value, sub }) {
  return (
    <div className="stat-lift" style={{
      background: "var(--card)",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius-card)",
      padding: "22px 24px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <div style={{
          width: 40, height: 40, borderRadius: "50%",
          background: iconBg, color: iconColor,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          {icon}
        </div>
        <span style={{ fontSize: 12.5, fontWeight: 500, color: "var(--text-2)" }}>{label}</span>
      </div>
      <p style={{ fontSize: 28, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.03em", lineHeight: 1 }}>
        {value}
      </p>
      {sub && (
        <p style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 7, fontWeight: 500 }}>{sub}</p>
      )}
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */
export default async function Estadisticas() {
  const supabase = await createClient();
  const { data: raw } = await supabase
    .from("classes")
    .select("*")
    .order("created_at", { ascending: false });

  const classes = raw || [];

  /* Derived metrics */
  const weekAgo       = Date.now() - 7 * 86400000;
  const weekClasses   = classes.filter(c => new Date(c.created_at).getTime() >= weekAgo);
  const totalConcepts = classes.reduce((s, c) => s + (c.data?.concepts?.length || 0), 0);
  const weekConcepts  = weekClasses.reduce((s, c) => s + (c.data?.concepts?.length || 0), 0);
  const totalHours    = classes.reduce((s, c) => s + wordsInTranscript(c), 0) / 130 / 60;
  const weekHours     = weekClasses.reduce((s, c) => s + wordsInTranscript(c), 0) / 130 / 60;
  const materials     = classes.filter(c => c.data?.material_summary).length;
  const streak        = currentStreak(classes);
  const quiz          = quizStats(classes);
  const weeks         = weeklyActivity(classes);
  const maxCount      = Math.max(...weeks.map(w => w.count), 1);

  /* Subject breakdown */
  const subjectMap = {};
  for (const c of classes) {
    const label = getSubjectLabel(c.title);
    if (!subjectMap[label]) subjectMap[label] = { count: 0, concepts: 0 };
    subjectMap[label].count++;
    subjectMap[label].concepts += c.data?.concepts?.length || 0;
  }
  const subjects = Object.entries(subjectMap)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5);

  /* Most productive day */
  const dayCount = Array(7).fill(0);
  for (const c of classes) dayCount[new Date(c.created_at).getDay()]++;
  const DAY_NAMES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const bestDay = dayCount.indexOf(Math.max(...dayCount));

  return (
    <div style={{ padding: "40px 48px", display: "flex", flexDirection: "column", gap: "36px", maxWidth: 1100 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em" }}>
            Estadísticas
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-2)", marginTop: 6 }}>
            Tu progreso de aprendizaje en VibeLearning
          </p>
        </div>
        <Link href="/class/new" style={{ textDecoration: "none" }}>
          <button className="btn-accent" style={{
            display: "flex", alignItems: "center", gap: 7,
            background: "var(--accent)", color: "white", border: "none",
            borderRadius: "var(--radius-btn)", padding: "10px 20px",
            fontWeight: 600, fontSize: 14, cursor: "pointer", letterSpacing: "-0.01em",
          }}>
            <IcoPlay s={14} />
            Nueva clase
          </button>
        </Link>
      </div>

      {/* Empty state */}
      {classes.length === 0 && (
        <div style={{
          background: "var(--card)", border: "1px solid var(--border)",
          borderRadius: "var(--radius-card)", padding: "64px 48px", textAlign: "center",
        }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>📊</div>
          <p style={{ fontWeight: 600, color: "var(--text)", marginBottom: 8, fontSize: 16 }}>
            Aún no hay datos
          </p>
          <p style={{ fontSize: 14, color: "var(--text-2)", marginBottom: 24 }}>
            Completa al menos una clase para ver tus estadísticas.
          </p>
          <Link href="/class/new" style={{ textDecoration: "none" }}>
            <button className="btn-accent" style={{
              background: "var(--accent)", color: "white", border: "none",
              borderRadius: "var(--radius-btn)", padding: "11px 24px",
              fontWeight: 600, fontSize: 14, cursor: "pointer",
            }}>
              Iniciar clase
            </button>
          </Link>
        </div>
      )}

      {classes.length > 0 && (
        <>
          {/* ── KPI grid ──────────────────────────────────────────────── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
            <StatCard
              icon={<IcoGradCap s={18} />}
              iconBg="rgba(124,108,248,0.15)" iconColor="#7C6CF8"
              label="Clases totales"
              value={classes.length}
              sub={weekClasses.length > 0 ? `+${weekClasses.length} esta semana` : "Sigue así"}
            />
            <StatCard
              icon={<IcoZap s={18} />}
              iconBg="rgba(34,197,94,0.13)" iconColor="#22C55E"
              label="Conceptos aprendidos"
              value={totalConcepts}
              sub={weekConcepts > 0 ? `+${weekConcepts} esta semana` : undefined}
            />
            <StatCard
              icon={<IcoClock s={18} />}
              iconBg="rgba(96,165,250,0.12)" iconColor="#60A5FA"
              label="Horas de clase"
              value={fmtHours(totalHours)}
              sub={weekHours > 0 ? `${fmtHours(weekHours)} esta semana` : undefined}
            />
            <StatCard
              icon={<IcoFileText s={18} />}
              iconBg="rgba(251,191,36,0.12)" iconColor="#FBBF24"
              label="Materiales subidos"
              value={materials}
              sub={materials === 0 ? "Sube un PDF en tu próxima clase" : "PDFs con resumen IA"}
            />
            {streak > 0 && (
              <StatCard
                icon={<IcoTrend s={18} />}
                iconBg="rgba(239,68,68,0.12)" iconColor="#EF4444"
                label="Racha actual"
                value={`${streak} día${streak !== 1 ? "s" : ""}`}
                sub="Días consecutivos estudiando"
              />
            )}
            {quiz.pct !== null && (
              <StatCard
                icon={<IcoTarget s={18} />}
                iconBg="rgba(167,139,250,0.12)" iconColor="#A78BFA"
                label="Active recall"
                value={`${quiz.pct}%`}
                sub={`${quiz.correct} / ${quiz.total} respuestas correctas`}
              />
            )}
          </div>

          {/* ── Activity bar chart ─────────────────────────────────────── */}
          <div style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-card)",
            padding: "28px 28px 24px",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>Actividad semanal</h2>
                <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 4 }}>Clases completadas por semana (últimas 8)</p>
              </div>
              {classes.length > 0 && (
                <span style={{
                  fontSize: 11.5, fontWeight: 600, color: "#22C55E",
                  background: "rgba(34,197,94,0.10)", borderRadius: 99,
                  padding: "4px 12px", border: "1px solid rgba(34,197,94,0.2)",
                }}>
                  {DAY_NAMES[bestDay]} es tu día más productivo
                </span>
              )}
            </div>

            {/* Bars */}
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end", height: 120 }}>
              {weeks.map((w, i) => {
                const isLast = i === weeks.length - 1;
                const pct    = w.count === 0 ? 4 : Math.max(8, (w.count / maxCount) * 100);
                return (
                  <div key={i} style={{
                    flex: 1, display: "flex", flexDirection: "column",
                    alignItems: "center", gap: 6, minWidth: 0,
                  }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, color: isLast ? "var(--accent)" : (w.count > 0 ? "var(--text-2)" : "transparent"),
                    }}>
                      {w.count > 0 ? w.count : ""}
                    </span>
                    <div style={{
                      width: "100%", height: `${pct}%`,
                      background: w.count === 0
                        ? "rgba(255,255,255,0.05)"
                        : isLast
                          ? "linear-gradient(180deg, #7C6CF8, #A78BFA)"
                          : "rgba(124,108,248,0.40)",
                      borderRadius: "6px 6px 4px 4px",
                      transition: "height 400ms ease",
                      border: isLast && w.count > 0 ? "1px solid rgba(124,108,248,0.5)" : "1px solid transparent",
                    }} />
                  </div>
                );
              })}
            </div>

            {/* X labels */}
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              {weeks.map((w, i) => (
                <div key={i} style={{
                  flex: 1, textAlign: "center",
                  fontSize: 10, color: i === weeks.length - 1 ? "var(--accent)" : "var(--text-3)",
                  fontWeight: i === weeks.length - 1 ? 600 : 400,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {w.label}
                </div>
              ))}
            </div>
          </div>

          {/* ── Bottom row: subjects + best day breakdown ─────────────── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

            {/* Subject breakdown */}
            <div style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-card)",
              padding: "24px",
            }}>
              <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", marginBottom: 20 }}>
                Materias estudiadas
              </h2>
              {subjects.length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--text-3)" }}>Sin datos aún.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {subjects.map(([label, data]) => {
                    const col = subjectColor(label);
                    const pct = classes.length > 0 ? Math.round((data.count / classes.length) * 100) : 0;
                    return (
                      <div key={label}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{
                              width: 8, height: 8, borderRadius: "50%",
                              background: col.fg, flexShrink: 0,
                            }} />
                            <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>{label}</span>
                          </div>
                          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                            <span style={{ fontSize: 11, color: "var(--text-3)" }}>
                              {data.concepts} conceptos
                            </span>
                            <span style={{ fontSize: 12, fontWeight: 600, color: col.fg }}>{pct}%</span>
                          </div>
                        </div>
                        <div style={{ height: 5, background: "rgba(255,255,255,0.05)", borderRadius: 99 }}>
                          <div style={{
                            height: "100%", width: `${pct}%`,
                            background: col.fg, borderRadius: 99,
                            opacity: 0.7,
                          }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Day of week heatmap */}
            <div style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-card)",
              padding: "24px",
            }}>
              <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", marginBottom: 20 }}>
                Día más activo
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {DAY_NAMES.map((name, i) => {
                  const count  = dayCount[i] || 0;
                  const maxDay = Math.max(...dayCount, 1);
                  const pct    = count === 0 ? 0 : Math.max(6, (count / maxDay) * 100);
                  const isBest = i === bestDay && count > 0;
                  return (
                    <div key={name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{
                        fontSize: 12, fontWeight: isBest ? 700 : 400,
                        color: isBest ? "var(--accent)" : "var(--text-3)",
                        width: 28, flexShrink: 0,
                      }}>
                        {name}
                      </span>
                      <div style={{ flex: 1, height: 6, background: "rgba(255,255,255,0.05)", borderRadius: 99 }}>
                        <div style={{
                          height: "100%", width: `${pct}%`,
                          background: isBest
                            ? "linear-gradient(90deg, #7C6CF8, #A78BFA)"
                            : "rgba(124,108,248,0.35)",
                          borderRadius: 99,
                        }} />
                      </div>
                      <span style={{ fontSize: 11, color: "var(--text-3)", width: 20, textAlign: "right", flexShrink: 0 }}>
                        {count > 0 ? count : ""}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
