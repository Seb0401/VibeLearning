import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

// ─── helpers ──────────────────────────────────────────────────────────────────

function getClassStyle(title, idx) {
  const t = (title || "").toLowerCase();
  if (t.match(/machine.?learn|neural|deep.?learn|\bml\b|\bia\b/))
    return { symbol: "◈", bg: "rgba(59,130,246,0.15)", color: "#60a5fa" };
  if (t.match(/cálculo|calculo|ecuaci|integr|derivad|serie|taylor|álgebra|algebra/))
    return { symbol: "Σ", bg: "rgba(139,92,246,0.15)", color: "#a78bfa" };
  if (t.match(/base.*dato|sql|database|tablas?|normaliz/))
    return { symbol: "⊞", bg: "rgba(16,185,129,0.15)", color: "#34d399" };
  if (t.match(/program|código|codigo|oop|objeto|herencia|polimorf/))
    return { symbol: "</>", bg: "rgba(245,158,11,0.15)", color: "#fbbf24" };
  const POOL = [
    { symbol: "◈", bg: "rgba(59,130,246,0.15)", color: "#60a5fa" },
    { symbol: "Σ", bg: "rgba(139,92,246,0.15)", color: "#a78bfa" },
    { symbol: "⊞", bg: "rgba(16,185,129,0.15)", color: "#34d399" },
    { symbol: "</>", bg: "rgba(245,158,11,0.15)", color: "#fbbf24" },
  ];
  return POOL[idx % POOL.length];
}

function estimateDuration(transcript) {
  if (!transcript) return null;
  const words = transcript.trim().split(/\s+/).filter(Boolean).length;
  const min = Math.round(words / 130);
  return min >= 1 ? `${min} min` : null;
}

function formatClassDate(dateStr) {
  const d = new Date(dateStr);
  return {
    date: d.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" }),
    time: d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false }),
  };
}

function timeSince(dateStr) {
  const days = Math.floor((Date.now() - new Date(dateStr)) / 86400000);
  if (days === 0) return "Hoy";
  if (days === 1) return "Hace 1 día";
  if (days < 7) return `Hace ${days} días`;
  const weeks = Math.floor(days / 7);
  if (weeks === 1) return "Hace 1 semana";
  if (weeks < 4) return `Hace ${weeks} semanas`;
  const months = Math.floor(days / 30);
  return months === 1 ? "Hace 1 mes" : `Hace ${months} meses`;
}

function computeStats(classes) {
  const weekAgo = Date.now() - 7 * 86400000;
  const week = classes.filter((c) => new Date(c.created_at).getTime() >= weekAgo);
  const totalConcepts = classes.reduce((s, c) => s + (c.data?.concepts?.length || 0), 0);
  const weekConcepts = week.reduce((s, c) => s + (c.data?.concepts?.length || 0), 0);
  const totalWords = classes.reduce(
    (s, c) => s + (c.data?.transcript || "").trim().split(/\s+/).filter(Boolean).length, 0
  );
  const weekWords = week.reduce(
    (s, c) => s + (c.data?.transcript || "").trim().split(/\s+/).filter(Boolean).length, 0
  );
  return {
    total: classes.length,
    weekCount: week.length,
    totalConcepts,
    weekConcepts,
    totalHours: totalWords / 130 / 60,
    weekHours: weekWords / 130 / 60,
    materialsCount: classes.filter((c) => c.data?.material_summary).length,
  };
}

function fmtH(h) {
  if (h < 0.017) return "0 h";
  if (h < 1) return `${Math.round(h * 60)} min`;
  return `${h.toFixed(1)} h`;
}

// ─── sub-components (server-renderable) ───────────────────────────────────────

function StatCard({ icon, iconBg, iconColor, label, value, delta, deltaGreen = true, progressPct }) {
  return (
    <div style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius)",
      padding: "1.25rem",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        <div style={{
          width: 46, height: 46, borderRadius: 12,
          background: iconBg,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, fontSize: "1.25rem", color: iconColor,
        }}>{icon}</div>
        <div>
          <p style={{ color: "var(--text-muted)", fontSize: "0.78rem", margin: 0 }}>{label}</p>
          <p style={{ fontSize: "1.65rem", fontWeight: 700, color: "var(--text)", margin: "3px 0 0", lineHeight: 1 }}>{value}</p>
        </div>
      </div>
      <p style={{ fontSize: "0.75rem", color: deltaGreen ? "#22c55e" : "var(--text-muted)", margin: "10px 0 0" }}>{delta}</p>
      {progressPct !== undefined && (
        <div style={{ marginTop: 8, height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" }}>
          <div style={{ height: "100%", background: "var(--accent)", width: `${progressPct}%`, borderRadius: 4 }} />
        </div>
      )}
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default async function Dashboard() {
  const supabase = await createClient();
  const [{ data: { user } }, { data: rawClasses }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("classes").select("*").order("created_at", { ascending: false }),
  ]);

  const classes = rawClasses || [];
  const rawName = user?.email?.split("@")[0] || "alumno";
  const displayName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
  const stats = computeStats(classes);
  const lastClass = classes[0] ?? null;
  const lastClassStyle = lastClass ? getClassStyle(lastClass.title, 0) : null;
  const recentMaterials = classes.filter((c) => c.data?.material_summary).slice(0, 3);
  const MATERIAL_COLORS = ["#ef4444", "#22c55e", "#f59e0b"];

  return (
    <div style={{ padding: "2rem 2.5rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 700, margin: 0, color: "var(--text)" }}>
            Buen regreso, {displayName} 👋
          </h1>
          <p style={{ color: "var(--text-muted)", margin: "4px 0 0", fontSize: "0.9rem" }}>
            Sigue aprendiendo con tus clases.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Link href="/class/new" style={{ textDecoration: "none" }}>
            <button style={{
              display: "flex", alignItems: "center", gap: 7,
              background: "var(--accent)", color: "white", border: "none",
              borderRadius: 10, padding: "0.6rem 1.25rem",
              fontWeight: 600, fontSize: "0.875rem", cursor: "pointer",
            }}>▶ Iniciar clase</button>
          </Link>
          <button style={{
            display: "flex", alignItems: "center", gap: 7,
            background: "transparent", color: "var(--text)",
            border: "1px solid var(--border)", borderRadius: 10,
            padding: "0.6rem 1.25rem", fontWeight: 500,
            fontSize: "0.875rem", cursor: "pointer",
          }}>⏱ Ver historial</button>
        </div>
      </div>

      {/* ── Stats grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1rem" }}>
        <StatCard
          icon="🎓"
          iconBg="rgba(124,109,242,0.15)"
          iconColor="var(--accent)"
          label="Clases completadas"
          value={stats.total}
          delta={`+${stats.weekCount} esta semana`}
        />
        <StatCard
          icon="⏱"
          iconBg="rgba(59,130,246,0.15)"
          iconColor="#60a5fa"
          label="Horas estudiadas"
          value={fmtH(stats.totalHours)}
          delta={`+${fmtH(stats.weekHours)} esta semana`}
        />
        <StatCard
          icon="✓"
          iconBg="rgba(34,197,94,0.15)"
          iconColor="#22c55e"
          label="Conceptos dominados"
          value={stats.totalConcepts}
          delta={`+${stats.weekConcepts} esta semana`}
        />
        <StatCard
          icon="📄"
          iconBg="rgba(59,130,246,0.15)"
          iconColor="#60a5fa"
          label="Materiales subidos"
          value={stats.materialsCount}
          delta={`de ${stats.total} clases`}
          deltaGreen={false}
          progressPct={stats.total > 0 ? Math.round((stats.materialsCount / stats.total) * 100) : 0}
        />
      </div>

      {/* ── Content row ── */}
      <div style={{ display: "flex", gap: "1.5rem", alignItems: "flex-start" }}>

        {/* Classes list */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h2 style={{ fontSize: "1.05rem", fontWeight: 700, margin: 0 }}>Clases pasadas</h2>
            <Link href="/dashboard/historial" style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--accent)", fontSize: "0.85rem", textDecoration: "none", fontWeight: 500 }}>
              Ver todas ›
            </Link>
          </div>

          {classes.length === 0 ? (
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "2.5rem", textAlign: "center" }}>
              <p style={{ color: "var(--text-muted)", margin: 0 }}>Aún no tienes clases guardadas. ¡Empieza una nueva!</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {classes.map((c, idx) => {
                const st = getClassStyle(c.title, idx);
                const duration = estimateDuration(c.data?.transcript);
                const { date, time } = formatClassDate(c.created_at);
                const tags = (c.data?.concepts || []).map((x) => x.name || x).filter(Boolean);
                const hasPDF = !!c.data?.material_summary;

                return (
                  <div key={c.id} style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                    padding: "1rem 1.25rem",
                    display: "flex", gap: 14, alignItems: "flex-start",
                  }}>
                    {/* Icon */}
                    <div style={{ position: "relative", flexShrink: 0 }}>
                      <div style={{
                        width: 52, height: 52, borderRadius: 10,
                        background: st.bg,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: st.color, fontWeight: 700, fontSize: "0.9rem",
                      }}>{st.symbol}</div>
                      {hasPDF && (
                        <span style={{
                          position: "absolute", bottom: -5, right: -5,
                          background: "#ef4444", color: "white",
                          fontSize: "0.55rem", fontWeight: 700,
                          borderRadius: 4, padding: "1px 4px",
                          border: "1.5px solid var(--bg)",
                        }}>PDF</span>
                      )}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Row 1 */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                        <span style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--text)" }}>{c.title}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                          <span style={{ display: "flex", alignItems: "center", gap: 5, color: "#22c55e", fontSize: "0.78rem", fontWeight: 500 }}>
                            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
                            Completada
                          </span>
                          <button style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "1.1rem", letterSpacing: 1, padding: "0 2px", lineHeight: 1 }}>⋯</button>
                        </div>
                      </div>

                      {/* Row 2: metadata */}
                      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-muted)", fontSize: "0.77rem", margin: "5px 0 8px" }}>
                        <span>📅 {date}</span>
                        <span>·</span>
                        <span>{time}</span>
                        {duration && <><span>·</span><span>⏱ {duration}</span></>}
                      </div>

                      {/* Row 3: tags + actions */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {tags.slice(0, 3).map((tag, ti) => (
                            <span key={ti} style={{
                              background: "rgba(124,109,242,0.1)", color: "var(--accent)",
                              fontSize: "0.72rem", borderRadius: 6, padding: "2px 8px",
                            }}>{tag}</span>
                          ))}
                          {tags.length > 3 && (
                            <span style={{ color: "var(--text-muted)", fontSize: "0.72rem", alignSelf: "center" }}>
                              +{tags.length - 3}
                            </span>
                          )}
                        </div>
                        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                          <Link href={`/class/${c.id}`} style={{ textDecoration: "none" }}>
                            <button style={{
                              display: "flex", alignItems: "center", gap: 5,
                              background: "var(--bg)", border: "1px solid var(--border)",
                              borderRadius: 8, padding: "4px 10px",
                              color: "var(--text)", fontSize: "0.75rem", cursor: "pointer",
                            }}>📄 Ver resumen</button>
                          </Link>
                          <Link href={`/class/${c.id}`} style={{ textDecoration: "none" }}>
                            <button style={{
                              display: "flex", alignItems: "center", gap: 5,
                              background: "var(--bg)", border: "1px solid var(--border)",
                              borderRadius: 8, padding: "4px 10px",
                              color: "var(--text)", fontSize: "0.75rem", cursor: "pointer",
                            }}>📜 Abrir transcript</button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Right panel ── */}
        <div style={{ width: 300, flexShrink: 0, display: "flex", flexDirection: "column", gap: "1rem" }}>

          {/* Continue where you left off */}
          {lastClass && (
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "1.25rem" }}>
              <p style={{ margin: "0 0 1rem", color: "var(--text-muted)", fontSize: "0.8rem", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                ↺ Continuar donde lo dejaste
              </p>

              <div style={{ display: "flex", gap: 12, marginBottom: "1rem" }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 8,
                  background: lastClassStyle.bg,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: lastClassStyle.color, fontWeight: 700, fontSize: "0.85rem", flexShrink: 0,
                }}>{lastClassStyle.symbol}</div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--text)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {lastClass.title}
                  </p>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.77rem", margin: "2px 0" }}>
                    {(lastClass.data?.concepts || []).slice(0, 1).map((x) => x.name || x).join(", ") || "Sin conceptos"}
                  </p>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.72rem", margin: 0 }}>
                    Visto por última vez: {timeSince(lastClass.created_at)}
                  </p>
                </div>
              </div>

              <div style={{ marginBottom: "1rem" }}>
                <p style={{ fontSize: "0.77rem", color: "var(--text-muted)", margin: "0 0 6px" }}>100% completada</p>
                <div style={{ height: 5, background: "var(--border)", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", background: "var(--accent)", width: "100%", borderRadius: 4 }} />
                </div>
              </div>

              <Link href={`/class/${lastClass.id}`} style={{ textDecoration: "none", display: "block" }}>
                <button style={{
                  width: "100%",
                  background: "var(--accent)", color: "white", border: "none",
                  borderRadius: 10, padding: "0.65rem",
                  fontWeight: 600, fontSize: "0.875rem", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}>▶ Continuar aprendiendo</button>
              </Link>
            </div>
          )}

          {/* Recent library */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <span style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--text)" }}>Biblioteca reciente</span>
              <span style={{ color: "var(--accent)", fontSize: "0.78rem", cursor: "pointer" }}>Ver biblioteca completa ›</span>
            </div>

            {recentMaterials.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", textAlign: "center", padding: "0.75rem 0", margin: 0 }}>
                Sube materiales en tu próxima clase
              </p>
            ) : (
              <div style={{ display: "flex", gap: 8 }}>
                {recentMaterials.map((c, i) => {
                  const d = new Date(c.created_at).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
                  return (
                    <Link key={c.id} href={`/class/${c.id}`} style={{ textDecoration: "none", flex: 1 }}>
                      <div style={{
                        background: "var(--bg)", border: "1px solid var(--border)",
                        borderRadius: 10, padding: "0.75rem 0.5rem", textAlign: "center",
                      }}>
                        <div style={{ fontSize: "1.4rem", marginBottom: 5 }}>📄</div>
                        <p style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--text)", margin: "0 0 4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {c.title}
                        </p>
                        <span style={{
                          fontSize: "0.6rem", fontWeight: 700,
                          color: MATERIAL_COLORS[i % MATERIAL_COLORS.length],
                          background: `${MATERIAL_COLORS[i % MATERIAL_COLORS.length]}18`,
                          borderRadius: 4, padding: "1px 5px",
                        }}>PDF</span>
                        <p style={{ fontSize: "0.63rem", color: "var(--text-muted)", margin: "4px 0 0" }}>{d}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            {classes.length > 0 && (
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "0.55rem 0.75rem", borderRadius: 8,
                border: "1px solid var(--border)", marginTop: "0.75rem",
                color: "var(--text-muted)", fontSize: "0.78rem", cursor: "pointer",
              }}>
                <span>📁 +{classes.length} recursos guardados</span>
                <span>›</span>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
