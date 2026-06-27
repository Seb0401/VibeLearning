import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import ClassCard from "./ClassCard";

function Icon({ size = 16, children }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}
const IcoPlay      = ({ s }) => <Icon size={s}><polygon points="5 3 19 12 5 21 5 3"/></Icon>;
const IcoChevRight = ({ s }) => <Icon size={s}><polyline points="9 18 15 12 9 6"/></Icon>;
const IcoFileText  = ({ s }) => <Icon size={s}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></Icon>;
const IcoRefresh   = ({ s }) => <Icon size={s}><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></Icon>;
const IcoCode      = ({ s }) => <Icon size={s}><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></Icon>;
const IcoDatabase  = ({ s }) => <Icon size={s}><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></Icon>;
const IcoBookOpen  = ({ s }) => <Icon size={s}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></Icon>;
const IcoSparkles  = ({ s }) => <Icon size={s}><path d="m12 3-1.9 5.8a2 2 0 0 1-1.287 1.288L3 12l5.8 1.9a2 2 0 0 1 1.288 1.287L12 21l1.9-5.8a2 2 0 0 1 1.287-1.288L21 12l-5.8-1.9a2 2 0 0 1-1.288-1.287Z"/></Icon>;
const IcoLayers    = ({ s }) => <Icon size={s}><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></Icon>;
const IcoZap       = ({ s }) => <Icon size={s}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></Icon>;

/* ── Subject ───────────────────────────────────────────────────────────── */
function getSubject(title, idx) {
  const t = (title || "").toLowerCase();
  if (t.match(/machine.?learn|neural|deep.?learn|\bml\b|\bia\b|intelig|ai/))
    return { icon: <IcoSparkles s={20} />, bg: "rgba(96,165,250,0.12)", color: "#60A5FA", label: "IA" };
  if (t.match(/cálculo|calculo|ecuaci|integr|derivad|serie|taylor|álgebra|algebra|matem/))
    return { icon: <span style={{ fontSize: 18, fontWeight: 700 }}>∑</span>, bg: "rgba(167,139,250,0.12)", color: "#A78BFA", label: "MAT" };
  if (t.match(/base.*dato|sql|database|datos|normaliz/))
    return { icon: <IcoDatabase s={20} />, bg: "rgba(34,197,94,0.12)", color: "#22C55E", label: "DB" };
  if (t.match(/program|código|codigo|oop|objeto|herencia|polimorf/))
    return { icon: <IcoCode s={20} />, bg: "rgba(251,191,36,0.12)", color: "#FBBF24", label: "CODE" };
  const POOL = [
    { icon: <IcoBookOpen s={20} />, bg: "rgba(96,165,250,0.12)",  color: "#60A5FA" },
    { icon: <IcoSparkles s={20} />, bg: "rgba(167,139,250,0.12)", color: "#A78BFA" },
    { icon: <IcoLayers   s={20} />, bg: "rgba(34,197,94,0.12)",   color: "#22C55E" },
    { icon: <IcoZap      s={20} />, bg: "rgba(251,191,36,0.12)",  color: "#FBBF24" },
  ];
  return POOL[idx % POOL.length];
}

function SubjectBadge({ title, idx, size = 48 }) {
  const s = getSubject(title, idx);
  return (
    <div style={{ width: size, height: size, borderRadius: 12, background: s.bg, color: s.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      {s.icon}
    </div>
  );
}

/* ── Helpers ───────────────────────────────────────────────────────────── */
function timeSince(dateStr) {
  const days = Math.floor((Date.now() - new Date(dateStr)) / 86400000);
  if (days === 0) return "hoy";
  if (days === 1) return "hace 1 día";
  if (days < 7)  return `hace ${days} días`;
  const w = Math.floor(days / 7);
  if (w < 4) return w === 1 ? "hace 1 semana" : `hace ${w} semanas`;
  const m = Math.floor(days / 30);
  return m === 1 ? "hace 1 mes" : `hace ${m} meses`;
}

function groupByDay(classes) {
  const now  = new Date();
  const todayStart     = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).getTime();
  const yesterdayStart = todayStart - 86400000;
  const weekStart      = todayStart - 6 * 86400000;

  const seen = new Map();
  for (const c of classes) {
    const d  = new Date(c.created_at);
    const ds = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).getTime();

    let label;
    if (ds === todayStart) {
      label = "Hoy";
    } else if (ds === yesterdayStart) {
      label = "Ayer";
    } else if (ds >= weekStart) {
      const raw = d.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "short", timeZone: "UTC" });
      label = raw.charAt(0).toUpperCase() + raw.slice(1);
    } else {
      label = d.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
    }

    if (!seen.has(label)) seen.set(label, []);
    seen.get(label).push(c);
  }
  return [...seen.entries()].map(([label, items]) => ({ label, items }));
}

/* ── Page ──────────────────────────────────────────────────────────────── */
export default async function Dashboard() {
  const supabase = await createClient();
  const [{ data: { user } }, { data: raw }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("classes").select("*").order("created_at", { ascending: false }),
  ]);

  const classes    = raw || [];
  const rawName    = user?.email?.split("@")[0] || "alumno";
  const name       = rawName.charAt(0).toUpperCase() + rawName.slice(1);
  const lastClass  = classes[0] ?? null;
  const lastPct    = lastClass
    ? Math.min(100, Math.round(((lastClass.data?.concepts?.length || 0) / 12) * 100))
    : 0;
  const lastConcept = lastClass
    ? (lastClass.data?.concepts?.[0]?.name || lastClass.data?.concepts?.[0] || null)
    : null;
  const recentPdfs = classes.filter(c => c.data?.material_summary).slice(0, 3);
  const dayGroups  = groupByDay(classes);

  return (
    <div style={{ padding: "40px 48px", display: "flex", flexDirection: "column", gap: "40px" }}>

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em" }}>
            Bienvenido de nuevo, {name} 👋
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-2)", marginTop: 6 }}>
            Continúa aprendiendo donde lo dejaste.
          </p>
        </div>
        <Link href="/class/new" style={{ textDecoration: "none" }}>
          <button className="btn-accent" style={{
            display: "flex", alignItems: "center", gap: 7,
            background: "var(--accent)", color: "white", border: "none",
            borderRadius: "var(--radius-btn)", padding: "10px 20px",
            fontWeight: 600, fontSize: 14, cursor: "pointer", letterSpacing: "-0.01em",
          }}>
            <IcoPlay s={15} />
            Iniciar clase
          </button>
        </Link>
      </div>

      {/* ── CONTENT ROW ────────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: "24px", alignItems: "flex-start" }}>

        {/* ── LEFT: CLASSES BY DAY ─────────────────────────────────────── */}
        <div style={{ flex: "0 0 65%", minWidth: 0 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", marginBottom: 20 }}>
            Clases
          </h2>

          {classes.length === 0 && (
            <div style={{
              background: "var(--card)", border: "1px solid var(--border)",
              borderRadius: "var(--radius-card)", padding: "48px", textAlign: "center",
            }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🎓</div>
              <p style={{ fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>Aún no tienes clases</p>
              <p style={{ fontSize: 13, color: "var(--text-2)" }}>Inicia tu primera clase y empieza a aprender con IA.</p>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {dayGroups.map(({ label, items }) => (
              <div key={label}>
                {/* Day header */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--text-3)", letterSpacing: "0.05em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                    {label}
                  </span>
                  <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                  <span style={{ fontSize: 11, color: "var(--text-3)", whiteSpace: "nowrap" }}>
                    {items.length} {items.length === 1 ? "clase" : "clases"}
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {items.map((c, i) => (
                    <ClassCard key={c.id} c={c} idx={i} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT PANEL ─────────────────────────────────────────────── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>

          {/* Continue learning */}
          {lastClass ? (
            <div style={{
              background: "var(--card)", border: "1px solid var(--border)",
              borderRadius: "var(--radius-card)", padding: 24,
              boxShadow: "0 0 0 1px rgba(124,108,248,0.08), 0 8px 32px rgba(0,0,0,0.2)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 20 }}>
                <span style={{ color: "var(--text-3)" }}><IcoRefresh s={13} /></span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-3)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                  Continuar donde lo dejaste
                </span>
              </div>

              <div style={{ display: "flex", gap: 14, marginBottom: 20 }}>
                <SubjectBadge title={lastClass.title} idx={0} size={44} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: 15, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {lastClass.title}
                  </p>
                  {lastConcept && (
                    <p style={{ fontSize: 12, color: "var(--text-2)", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {lastConcept}
                    </p>
                  )}
                  <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>
                    Visto {timeSince(lastClass.created_at)}
                  </p>
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: "var(--text-2)", fontWeight: 500 }}>Cobertura de conceptos</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)" }}>{lastPct}%</span>
                </div>
                <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${lastPct}%`, background: "linear-gradient(90deg, var(--accent), #A78BFA)", borderRadius: 99 }} />
                </div>
              </div>

              <Link href={`/class/${lastClass.id}`} style={{ textDecoration: "none", display: "block" }}>
                <button className="btn-accent" style={{
                  width: "100%", background: "var(--accent)", color: "white",
                  border: "none", borderRadius: "var(--radius-btn)",
                  padding: "12px 16px", fontWeight: 600, fontSize: 14, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}>
                  <IcoPlay s={15} />
                  Continuar aprendiendo
                </button>
              </Link>
            </div>
          ) : (
            <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-card)", padding: 24 }}>
              <p style={{ fontSize: 13, color: "var(--text-2)", textAlign: "center", padding: "16px 0" }}>
                Inicia tu primera clase para ver tu progreso aquí.
              </p>
              <Link href="/class/new" style={{ textDecoration: "none", display: "block" }}>
                <button className="btn-accent" style={{
                  width: "100%", background: "var(--accent)", color: "white",
                  border: "none", borderRadius: "var(--radius-btn)",
                  padding: "11px 16px", fontWeight: 600, fontSize: 14, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}>
                  <IcoPlay s={15} />
                  Iniciar primera clase
                </button>
              </Link>
            </div>
          )}

          {/* Recent library */}
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-card)", padding: "20px 20px 8px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>Biblioteca reciente</h3>
              <Link href="/dashboard/biblioteca" style={{ textDecoration: "none" }}>
                <span style={{ fontSize: 12, color: "var(--accent)", cursor: "pointer", fontWeight: 500 }}>Ver todo</span>
              </Link>
            </div>

            {recentPdfs.length === 0 ? (
              <p style={{ fontSize: 12, color: "var(--text-3)", textAlign: "center", padding: "12px 0 16px" }}>
                Sin materiales subidos aún.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {recentPdfs.map((c, i) => {
                  const d = new Date(c.created_at).toLocaleDateString("es-MX", { day: "numeric", month: "short" });
                  const COLORS = [
                    { bg: "rgba(239,68,68,0.1)", fg: "#EF4444" },
                    { bg: "rgba(34,197,94,0.1)", fg: "#22C55E" },
                    { bg: "rgba(251,191,36,0.1)", fg: "#FBBF24" },
                  ];
                  const col = COLORS[i % COLORS.length];
                  return (
                    <Link key={c.id} href={`/class/${c.id}`} style={{ textDecoration: "none" }}>
                      <div className="row-hover" style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 8px", marginBottom: 2 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 9, background: col.bg, color: col.fg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <IcoFileText s={16} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {c.title}
                          </p>
                          <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>PDF · {d}</p>
                        </div>
                        <span style={{ color: "var(--text-3)", flexShrink: 0 }}><IcoChevRight s={14} /></span>
                      </div>
                    </Link>
                  );
                })}
                {classes.length > 3 && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 8px 12px", color: "var(--text-3)", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>
                    <span>+{classes.length} recursos guardados</span>
                    <IcoChevRight s={13} />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
