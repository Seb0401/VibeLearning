import { createClient } from "@/lib/supabase/server";
import { getUserTimeZone } from "@/lib/timezone";
import Link from "next/link";
import ClassDayList from "./ClassDayList";
import { Greeting, ReviewTodayCard } from "./HomeWidgets";
import CoursesWidget from "@/components/CoursesWidget";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Icon, { IconBadge } from "@/components/Icon";
import Mascot from "@/components/Mascot";

const RECENT_LIMIT = 5;

/* ── Materia (icono + color) según el título ───────────────────────────── */
function getSubject(title) {
  const t = (title || "").toLowerCase();
  if (t.match(/machine.?learn|neural|deep.?learn|\bml\b|\bia\b|intelig/)) return { icon: "sparkles",   color: "var(--blue)" };
  if (t.match(/cálculo|calculo|ecuaci|integr|derivad|serie|taylor|álgebra|algebra|matem/)) return { icon: "sigma", color: "var(--violet)" };
  if (t.match(/base.*dato|sql|database|datos|normaliz/)) return { icon: "archive", color: "var(--green)" };
  if (t.match(/program|código|codigo|oop|objeto|herencia|polimorf/)) return { icon: "zap", color: "var(--yellow)" };
  if (t.match(/biolog|fotos|célula|celula|quím|quim|físic|fisic/)) return { icon: "microscope", color: "#2DD4BF" };
  return { icon: "book-open", color: "var(--blue)" };
}

/* ── Helpers ───────────────────────────────────────────────────────────── */
function timeSince(dateStr, now) {
  const days = Math.floor((now - new Date(dateStr)) / 86400000);
  if (days <= 0) return "hoy";
  if (days === 1) return "ayer";
  if (days < 7)  return `hace ${days} días`;
  const w = Math.floor(days / 7);
  if (w < 4) return w === 1 ? "hace 1 semana" : `hace ${w} semanas`;
  const m = Math.floor(days / 30);
  return m === 1 ? "hace 1 mes" : `hace ${m} meses`;
}

// Días seguidos con al menos una clase, contados en la zona horaria del usuario.
function currentStreak(classes, tz, now) {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" });
  const days = new Set(classes.map((c) => fmt.format(new Date(c.created_at))));
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const key = fmt.format(new Date(now - i * 86400000));
    if (days.has(key)) streak++;
    else if (i > 0) break; // hoy puede no tener clase todavía
  }
  return streak;
}

function plainSnippet(markdown, max = 170) {
  if (!markdown) return "";
  const text = markdown
    .replace(/^#{1,6}\s.*$/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? text.slice(0, max).replace(/\s\S*$/, "").replace(/[.,;:\s]+$/, "") + "…" : text;
}

function conceptName(c) {
  return typeof c === "string" ? c : c?.name;
}

/* ── Piezas de la página ───────────────────────────────────────────────── */
function Kpi({ icon, color, label, value, hint }) {
  return (
    <div className="ui-card ui-card--sm" style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <IconBadge name={icon} color={color} size={40} />
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em", lineHeight: 1.1 }}>{value}</p>
        <p style={{ fontSize: 12, color: "var(--text-2)", marginTop: 3 }}>{label}</p>
        {hint && <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 1 }}>{hint}</p>}
      </div>
    </div>
  );
}

function ContinueCard({ cls, now }) {
  const subj = getSubject(cls.title);
  const concepts = (cls.data?.concepts || []).map(conceptName).filter(Boolean);
  const quiz = cls.data?.quiz_stats;
  const pct = quiz?.total > 0 ? Math.round((quiz.correct / quiz.total) * 100) : null;
  const snippet = plainSnippet(cls.data?.final_summary);

  return (
    <div className="ui-card ui-card--lg" style={{ position: "relative", overflow: "hidden", borderColor: "rgba(124,108,248,0.22)" }}>
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 60% 90% at 100% 0%, rgba(124,108,248,0.14), transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "relative" }}>
        <p style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "var(--accent-hover)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
          <Icon name="repeat" size={13} /> Continúa donde lo dejaste
        </p>

        <div style={{ display: "flex", gap: 16, alignItems: "flex-start", marginTop: 16 }}>
          <IconBadge name={subj.icon} color={subj.color} size={52} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <h2 style={{ fontSize: 19, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em", lineHeight: 1.3 }}>{cls.title}</h2>
            <p style={{ fontSize: 12.5, color: "var(--text-3)", marginTop: 4 }}>
              Vista {timeSince(cls.created_at, now)} · {concepts.length} {concepts.length === 1 ? "concepto" : "conceptos"}
              {cls.data?.material_summary ? " · con PDF" : ""}
            </p>
            {snippet && (
              <p style={{ fontSize: 13.5, color: "var(--text-2)", lineHeight: 1.65, marginTop: 12, maxWidth: 620 }}>{snippet}</p>
            )}
          </div>
        </div>

        {concepts.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 16 }}>
            {concepts.slice(0, 6).map((c) => (
              <span key={c} style={{ fontSize: 11.5, color: "var(--text-2)", background: "var(--tint-2)", border: "1px solid var(--border-strong)", borderRadius: 99, padding: "3px 10px" }}>{c}</span>
            ))}
            {concepts.length > 6 && <span style={{ fontSize: 11.5, color: "var(--text-3)", padding: "3px 4px" }}>+{concepts.length - 6}</span>}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap", marginTop: 20 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button href={`/class/${cls.id}`} icon="book-open">Ver clase</Button>
            <Button href="/dashboard/repaso" variant="ghost" icon="repeat">Repasar conceptos</Button>
          </div>
          {pct !== null && (
            <div style={{ flex: "1 1 180px", minWidth: 160, maxWidth: 280 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                <span style={{ color: "var(--text-2)" }}>Aciertos en el quiz · {quiz.correct}/{quiz.total}</span>
                <span style={{ color: "var(--accent-hover)", fontWeight: 700 }}>{pct}%</span>
              </div>
              <div style={{ height: 6, background: "var(--tint-3)", borderRadius: 99, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg, var(--accent), #A78BFA)", borderRadius: 99 }} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const QUICK_ACTIONS = [
  { href: "/dashboard/biblioteca",   icon: "upload",    color: "var(--blue)", label: "Subir PDF",       hint: "Material para el chatbot" },
  { href: "/dashboard/evaluaciones", icon: "clipboard", color: "var(--violet)", label: "Generar examen",  hint: "Con tus clases" },
  { href: "/dashboard/cheat-sheet",  icon: "file-text", color: "var(--yellow)", label: "Cheat sheet",     hint: "Resumen de una página" },
  { href: "/dashboard/mapa-global",  icon: "network",   color: "var(--green)", label: "Mapa global",     hint: "Todos tus conceptos" },
];

function QuickActions() {
  return (
    <Card title="Acciones rápidas">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
        {QUICK_ACTIONS.map((a) => (
          <Link key={a.href} href={a.href} className="quick-action">
            <IconBadge name={a.icon} color={a.color} size={34} />
            <span style={{ minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{a.label}</span>
              <span style={{ display: "block", fontSize: 11, color: "var(--text-3)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.hint}</span>
            </span>
          </Link>
        ))}
      </div>
    </Card>
  );
}

function RecentLibrary({ items, total }) {
  return (
    <Card title="Biblioteca reciente" action={<Link href="/dashboard/biblioteca" className="ui-link">Ver todo <Icon name="chevron-right" size={13} /></Link>}>
      {items.length === 0 ? (
        <p style={{ fontSize: 12.5, color: "var(--text-3)", lineHeight: 1.6 }}>
          Sube el PDF de una clase y el chatbot lo usará como contexto.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 2, margin: "0 -8px" }}>
          {items.map((c) => (
            <Link key={c.id} href={`/class/${c.id}`} className="row-hover" style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 8px", textDecoration: "none" }}>
              <IconBadge name="file-text" color="#F87171" size={34} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title}</span>
                <span style={{ display: "block", fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>
                  PDF · {new Date(c.created_at).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
                </span>
              </span>
              <span style={{ color: "var(--text-3)" }}><Icon name="chevron-right" size={14} /></span>
            </Link>
          ))}
          {total > items.length && (
            <Link href="/dashboard/biblioteca" className="ui-link" style={{ padding: "8px 8px 2px" }}>+{total - items.length} materiales más</Link>
          )}
        </div>
      )}
    </Card>
  );
}

function MotivationCard({ streak, weekClasses, accuracy }) {
  const msg =
    streak >= 2 ? { title: `¡${streak} días seguidos!`, text: "Vas muy bien. Una clase más hoy y mantienes la racha." } :
    accuracy !== null && accuracy >= 80 ? { title: "¡Buen trabajo!", text: `Llevas ${accuracy}% de aciertos en tus quizzes. Sigue así.` } :
    weekClasses > 0 ? { title: "¡Tú puedes!", text: "Un poco de esfuerzo hoy, grandes resultados mañana." } :
    { title: "¡Te extrañamos!", text: "Graba una clase hoy y retoma tu racha de estudio." };
  const pose = streak >= 2 || (accuracy !== null && accuracy >= 80) ? "logro" : "tu-puedes";
  return (
    <div className="motivation-card">
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{ fontSize: 17, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.01em" }}>{msg.title}</p>
        <p style={{ fontSize: 12.5, color: "var(--text-2)", marginTop: 4, lineHeight: 1.5 }}>{msg.text}</p>
      </div>
      <Mascot pose={pose} size={96} halo={false} />
    </div>
  );
}

function Onboarding() {
  const STEPS = [
    { icon: "mic",       color: "var(--blue)", title: "Graba tu clase",          text: "Transcribimos en vivo y detectamos los conceptos clave." },
    { icon: "zap",       color: "var(--yellow)", title: "Responde en el momento",  text: "Preguntas rápidas de active recall mientras avanza la clase." },
    { icon: "sparkles",  color: "var(--violet)", title: "Repasa lo importante",    text: "Resumen, mapa mental y repaso espaciado al terminar." },
  ];
  return (
    <div className="ui-card ui-card--lg" style={{ textAlign: "center" }}>
      <Mascot pose="hola" size={170} float priority style={{ margin: "0 auto 12px" }} />
      <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--text)" }}>¡Hola! ¿Listo para aprender?</h2>
      <p style={{ fontSize: 13.5, color: "var(--text-2)", marginTop: 6, maxWidth: 440, marginInline: "auto", lineHeight: 1.6 }}>
        VibeLearning te acompaña durante la clase y te deja todo listo para estudiar después.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, margin: "24px 0", textAlign: "left" }}>
        {STEPS.map((s, i) => (
          <div key={s.title} style={{ background: "var(--tint-1)", border: "1px solid var(--border)", borderRadius: 14, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <IconBadge name={s.icon} color={s.color} size={34} />
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)" }}>PASO {i + 1}</span>
            </div>
            <p style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text)", marginTop: 12 }}>{s.title}</p>
            <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 4, lineHeight: 1.55 }}>{s.text}</p>
          </div>
        ))}
      </div>
      <Button href="/class/new" size="lg" icon="mic">Iniciar mi primera clase</Button>
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────────────────────── */
export default async function Dashboard() {
  const supabase = await createClient();
  const [{ data: { user } }, { data: raw }, tz] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("classes").select("*").neq("title", "Clase en progreso...").order("created_at", { ascending: false }),
    getUserTimeZone(),
  ]);

  // eslint-disable-next-line react-hooks/purity -- Server Component: se renderiza una vez por request
  const now        = Date.now();
  const classes    = raw || [];
  const rawName    = user?.email?.split("@")[0] || "alumno";
  const name       = rawName.charAt(0).toUpperCase() + rawName.slice(1);
  const lastClass  = classes[0] ?? null;

  const weekAgo       = now - 7 * 86400000;
  const weekClasses   = classes.filter((c) => new Date(c.created_at).getTime() >= weekAgo).length;
  const totalConcepts = classes.reduce((s, c) => s + (c.data?.concepts?.length || 0), 0);
  const quizTotals    = classes.reduce((acc, c) => {
    const q = c.data?.quiz_stats;
    if (q?.total) { acc.total += q.total; acc.correct += q.correct || 0; }
    return acc;
  }, { total: 0, correct: 0 });
  const accuracy = quizTotals.total > 0 ? Math.round((quizTotals.correct / quizTotals.total) * 100) : null;
  const streak   = currentStreak(classes, tz, now);

  const withPdf    = classes.filter((c) => c.data?.material_summary);
  const reviewKeys = classes.flatMap((c) => (c.data?.concepts || []).map(conceptName).filter(Boolean).map((n) => `${c.id}:${n}`));

  return (
    <div className="dash-page">

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <div className="dash-header">
        <Greeting name={name} />
        <Button href="/class/new" icon="mic" size="lg">Iniciar clase</Button>
      </div>

      {classes.length === 0 ? (
        <Onboarding />
      ) : (
        <>
          {/* ── KPIs ───────────────────────────────────────────────────── */}
          <div className="kpi-row">
            <Kpi icon="book"      color="#7C6CF8" label="Clases esta semana" value={weekClasses} hint={`${classes.length} en total`} />
            <Kpi icon="lightbulb" color="#FBBF24" label="Conceptos aprendidos" value={totalConcepts} />
            <Kpi icon="target"    color="#22C55E" label="Aciertos en quiz" value={accuracy !== null ? `${accuracy}%` : "—"} hint={quizTotals.total ? `${quizTotals.correct}/${quizTotals.total} respuestas` : "Sin preguntas aún"} />
            <Kpi icon="flame"     color="#F97316" label="Racha" value={`${streak} ${streak === 1 ? "día" : "días"}`} hint={streak > 0 ? "¡Sigue así!" : "Graba una clase hoy"} />
          </div>

          {/* ── CONTENT ────────────────────────────────────────────────── */}
          <div className="dash-grid">
            <div style={{ display: "flex", flexDirection: "column", gap: 28, minWidth: 0 }}>
              <ContinueCard cls={lastClass} now={now} />

              <section>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>Clases recientes</h2>
                  {classes.length > RECENT_LIMIT && (
                    <Link href="/dashboard/historial" className="ui-link">Ver las {classes.length} <Icon name="chevron-right" size={13} /></Link>
                  )}
                </div>
                <ClassDayList classes={classes.slice(0, RECENT_LIMIT)} />
              </section>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
              <MotivationCard streak={streak} weekClasses={weekClasses} accuracy={accuracy} />
              <ReviewTodayCard cards={reviewKeys} />
              <QuickActions />
              <CoursesWidget classes={classes} />
              <RecentLibrary items={withPdf.slice(0, 3)} total={withPdf.length} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
