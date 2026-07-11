import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

/* ── Helpers ──────────────────────────────────────────────────────────── */
function groupByMonth(classes) {
  const map = new Map();
  for (const c of classes) {
    const d   = new Date(c.created_at);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const lbl = d.toLocaleDateString("es-MX", { month: "long", year: "numeric", timeZone: "UTC" });
    const label = lbl.charAt(0).toUpperCase() + lbl.slice(1);
    if (!map.has(key)) map.set(key, { key, label, classes: [] });
    map.get(key).classes.push(c);
  }
  return [...map.values()];
}

function getMilestones(classes) {
  const sorted = [...classes].reverse(); // oldest first
  const map = new Map();
  let totalConcepts = 0;
  sorted.forEach((c, i) => {
    const ms = [];
    if (i === 0)  ms.push({ text: "Primera clase", emoji: "🎉" });
    if (i === 4)  ms.push({ text: "5 clases completadas", emoji: "⭐" });
    if (i === 9)  ms.push({ text: "10 clases completadas", emoji: "🔥" });
    if (i === 24) ms.push({ text: "25 clases completadas", emoji: "🏆" });
    if (i === 49) ms.push({ text: "50 clases completadas", emoji: "🚀" });

    const prev = totalConcepts;
    totalConcepts += c.data?.concepts?.length || 0;
    if (prev < 50  && totalConcepts >= 50)  ms.push({ text: "50 conceptos aprendidos",  emoji: "🧠" });
    if (prev < 100 && totalConcepts >= 100) ms.push({ text: "100 conceptos aprendidos", emoji: "💡" });
    if (prev < 250 && totalConcepts >= 250) ms.push({ text: "250 conceptos aprendidos", emoji: "🎓" });

    if (ms.length) map.set(c.id, ms);
  });
  return map;
}

function fmtDay(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

function fmtTime(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" });
}

function estimateDur(transcript) {
  if (!transcript) return null;
  const m = Math.round(transcript.trim().split(/\s+/).filter(Boolean).length / 130);
  return m >= 1 ? `${m} min` : null;
}

/* ── Page ─────────────────────────────────────────────────────────────── */
export default async function Cronologia() {
  const supabase = await createClient();
  const { data: raw } = await supabase
    .from("classes").select("*").order("created_at", { ascending: false });

  const classes = raw || [];
  const milestones   = getMilestones(classes);
  const monthGroups  = groupByMonth(classes);

  const totalConcepts = classes.reduce((s, c) => s + (c.data?.concepts?.length || 0), 0);
  const withPDF       = classes.filter(c => c.data?.material_summary).length;
  const firstDate     = classes.length
    ? new Date(classes[classes.length - 1].created_at).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
    : null;

  const S = {
    dot: (active) => ({
      position: "absolute",
      left: -30, top: 16,
      width: 12, height: 12, borderRadius: "50%",
      background: active ? "var(--accent)" : "var(--border)",
      border: `2px solid ${active ? "var(--accent)" : "rgba(255,255,255,0.08)"}`,
      boxShadow: active ? "0 0 10px rgba(124,108,248,0.5)" : "none",
      zIndex: 1,
    }),
    card: {
      background: "var(--card)", border: "1px solid var(--border)",
      borderRadius: "var(--radius-card)", padding: "14px 18px",
      textDecoration: "none", display: "block",
      transition: "border-color 150ms, transform 150ms",
    },
  };

  return (
    <div style={{ padding: "40px 48px", display: "flex", flexDirection: "column", gap: 36, minHeight: "100vh" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em" }}>Cronología</h1>
          <p style={{ fontSize: 14, color: "var(--text-2)", marginTop: 6 }}>
            Tu historial de aprendizaje desde el primer día
          </p>
        </div>

        {/* Quick stats */}
        {classes.length > 0 && (
          <div style={{ display: "flex", gap: 16 }}>
            {[
              { label: "Clases",    value: classes.length },
              { label: "Conceptos", value: totalConcepts  },
              { label: "PDFs",      value: withPDF        },
            ].map(({ label, value }) => (
              <div key={label} style={{
                background: "var(--card)", border: "1px solid var(--border)",
                borderRadius: "var(--radius-card)", padding: "14px 20px", textAlign: "center", minWidth: 80,
              }}>
                <p style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em" }}>{value}</p>
                <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>{label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Empty */}
      {classes.length === 0 && (
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-card)", padding: 48, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>📅</div>
          <p style={{ fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>Aún no hay clases</p>
          <p style={{ fontSize: 13, color: "var(--text-2)" }}>
            <Link href="/class/new" style={{ color: "var(--accent)" }}>Inicia tu primera clase</Link> y aparecerá aquí.
          </p>
        </div>
      )}

      {/* Start marker */}
      {firstDate && (
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(124,108,248,0.12)", border: "1px solid rgba(124,108,248,0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7C6CF8" strokeWidth="2">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--accent)" }}>Inicio del viaje</p>
            <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>{firstDate}</p>
          </div>
        </div>
      )}

      {/* Timeline by month */}
      {monthGroups.map(({ key, label, classes: monthClasses }) => (
        <div key={key}>
          {/* Month header */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="1.75">
                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{label}</span>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }}/>
            <span style={{ fontSize: 12, color: "var(--text-3)" }}>{monthClasses.length} {monthClasses.length === 1 ? "clase" : "clases"}</span>
          </div>

          {/* Timeline entries */}
          <div style={{ position: "relative", paddingLeft: 40 }}>
            {/* Vertical line */}
            <div style={{ position: "absolute", left: 15, top: 4, bottom: 8, width: 2, background: "linear-gradient(180deg, var(--accent) 0%, var(--border) 100%)", borderRadius: 99 }}/>

            {monthClasses.map((c, idx) => {
              const ms      = milestones.get(c.id) || [];
              const dur     = estimateDur(c.data?.transcript);
              const concepts = c.data?.concepts || [];
              const hasPDF  = !!c.data?.material_summary;
              const isFirst = idx === 0;

              return (
                <div key={c.id} style={{ position: "relative", marginBottom: 16 }}>
                  {/* Timeline dot */}
                  <div style={S.dot(isFirst)} />

                  {/* Milestone badges */}
                  {ms.map(m => (
                    <div key={m.text} style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      background: "rgba(124,108,248,0.08)", border: "1px solid rgba(124,108,248,0.2)",
                      borderRadius: 99, padding: "3px 12px", marginBottom: 6, marginRight: 6,
                    }}>
                      <span style={{ fontSize: 13 }}>{m.emoji}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: "var(--accent)" }}>{m.text}</span>
                    </div>
                  ))}

                  {/* Class card */}
                  <Link href={`/class/${c.id}`} style={S.card} className="row-hover">
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {c.title}
                        </p>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 11, color: "var(--text-3)" }}>{fmtDay(c.created_at)}</span>
                          <span style={{ fontSize: 11, color: "var(--text-3)" }}>·</span>
                          <span style={{ fontSize: 11, color: "var(--text-3)" }}>{fmtTime(c.created_at)}</span>
                          {dur && <>
                            <span style={{ fontSize: 11, color: "var(--text-3)" }}>·</span>
                            <span style={{ fontSize: 11, color: "var(--text-3)" }}>{dur}</span>
                          </>}
                          {concepts.length > 0 && <>
                            <span style={{ fontSize: 11, color: "var(--text-3)" }}>·</span>
                            <span style={{ fontSize: 11, color: "var(--text-2)" }}>{concepts.length} conceptos</span>
                          </>}
                          {hasPDF && (
                            <span style={{ fontSize: 10, fontWeight: 700, background: "rgba(239,68,68,0.12)", color: "#EF4444", borderRadius: 4, padding: "1px 6px" }}>PDF</span>
                          )}
                        </div>
                      </div>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="1.75">
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
