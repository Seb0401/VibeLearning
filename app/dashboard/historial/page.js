import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import ClassCard from "@/app/dashboard/ClassCard";

function Icon({ size = 16, children }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}
const IcoPlay    = ({ s }) => <Icon size={s}><polygon points="5 3 19 12 5 21 5 3"/></Icon>;
const IcoSearch  = ({ s }) => <Icon size={s}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></Icon>;
const IcoCalendar = ({ s }) => <Icon size={s}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></Icon>;

function groupByMonth(classes) {
  const groups = {};
  for (const c of classes) {
    const d   = new Date(c.created_at);
    const now = new Date();
    let label;
    if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) {
      label = "Este mes";
    } else if (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() - 1
    ) {
      label = "Mes pasado";
    } else {
      label = d.toLocaleDateString("es-MX", { month: "long", year: "numeric" });
      label = label.charAt(0).toUpperCase() + label.slice(1);
    }
    if (!groups[label]) groups[label] = [];
    groups[label].push(c);
  }
  return groups;
}

export default async function Historial() {
  const supabase = await createClient();
  const { data: raw } = await supabase
    .from("classes")
    .select("*")
    .order("created_at", { ascending: false });

  const classes = raw || [];
  const groups  = groupByMonth(classes);

  const weekAgo     = Date.now() - 7 * 86400000;
  const weekCount   = classes.filter(c => new Date(c.created_at).getTime() >= weekAgo).length;
  const totalConcepts = classes.reduce((s, c) => s + (c.data?.concepts?.length || 0), 0);

  return (
    <div style={{ padding: "40px 48px", display: "flex", flexDirection: "column", gap: "32px", maxWidth: 900 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em" }}>
            Historial de clases
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-2)", marginTop: 6 }}>
            {classes.length} {classes.length === 1 ? "clase registrada" : "clases registradas"}
            {weekCount > 0 && ` · ${weekCount} esta semana`}
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

      {/* Quick stats strip */}
      {classes.length > 0 && (
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12,
        }}>
          {[
            { label: "Total de clases",   value: classes.length,    color: "#7C6CF8" },
            { label: "Conceptos totales", value: totalConcepts,     color: "#22C55E" },
            { label: "Esta semana",       value: weekCount,         color: "#FBBF24" },
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              background: "var(--card)", border: "1px solid var(--border)",
              borderRadius: "var(--radius-card)", padding: "16px 20px",
              display: "flex", flexDirection: "column", gap: 6,
            }}>
              <span style={{ fontSize: 12, color: "var(--text-3)", fontWeight: 500 }}>{label}</span>
              <span style={{ fontSize: 24, fontWeight: 700, color, letterSpacing: "-0.02em" }}>{value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {classes.length === 0 && (
        <div style={{
          background: "var(--card)", border: "1px solid var(--border)",
          borderRadius: "var(--radius-card)", padding: "64px 48px",
          textAlign: "center",
        }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>📚</div>
          <p style={{ fontWeight: 600, color: "var(--text)", marginBottom: 8, fontSize: 16 }}>Sin historial aún</p>
          <p style={{ fontSize: 14, color: "var(--text-2)", marginBottom: 24 }}>
            Inicia tu primera clase y empieza a construir tu historial de aprendizaje.
          </p>
          <Link href="/class/new" style={{ textDecoration: "none" }}>
            <button className="btn-accent" style={{
              background: "var(--accent)", color: "white", border: "none",
              borderRadius: "var(--radius-btn)", padding: "11px 24px",
              fontWeight: 600, fontSize: 14, cursor: "pointer",
            }}>
              Iniciar primera clase
            </button>
          </Link>
        </div>
      )}

      {/* Grouped class list */}
      {Object.entries(groups).map(([month, monthClasses]) => (
        <div key={month}>
          <div style={{
            display: "flex", alignItems: "center", gap: 10, marginBottom: 14,
          }}>
            <span style={{ color: "var(--text-3)" }}><IcoCalendar s={13} /></span>
            <span style={{
              fontSize: 11.5, fontWeight: 600, color: "var(--text-3)",
              letterSpacing: "0.06em", textTransform: "uppercase",
            }}>
              {month}
            </span>
            <span style={{
              fontSize: 11, fontWeight: 500, color: "var(--text-3)",
              background: "rgba(255,255,255,0.05)", borderRadius: 99,
              padding: "2px 8px", border: "1px solid var(--border)",
            }}>
              {monthClasses.length} {monthClasses.length === 1 ? "clase" : "clases"}
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {monthClasses.map((c, idx) => (
              <ClassCard key={c.id} c={c} idx={idx} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
