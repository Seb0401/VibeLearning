import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

function Icon({ size = 16, children }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}
const IcoFileText  = ({ s }) => <Icon size={s}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></Icon>;
const IcoChevRight = ({ s }) => <Icon size={s}><polyline points="9 18 15 12 9 6"/></Icon>;
const IcoPlay      = ({ s }) => <Icon size={s}><polygon points="5 3 19 12 5 21 5 3"/></Icon>;
const IcoTag       = ({ s }) => <Icon size={s}><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></Icon>;

const PDF_COLORS = [
  { bg: "rgba(239,68,68,0.10)",   fg: "#EF4444" },
  { bg: "rgba(124,108,248,0.12)", fg: "#7C6CF8" },
  { bg: "rgba(34,197,94,0.10)",   fg: "#22C55E" },
  { bg: "rgba(251,191,36,0.10)",  fg: "#FBBF24" },
  { bg: "rgba(96,165,250,0.10)",  fg: "#60A5FA" },
];

export default async function Biblioteca() {
  const supabase = await createClient();
  const { data: raw } = await supabase
    .from("classes")
    .select("*")
    .order("created_at", { ascending: false });

  const classes = raw || [];
  const withPDF = classes.filter(c => !!c.data?.material_summary);
  const totalConcepts = withPDF.reduce((s, c) => s + (c.data?.concepts?.length || 0), 0);

  return (
    <div style={{ padding: "40px 48px", display: "flex", flexDirection: "column", gap: "32px", maxWidth: 1100 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em" }}>
            Biblioteca de materiales
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-2)", marginTop: 6 }}>
            {withPDF.length} {withPDF.length === 1 ? "PDF subido" : "PDFs subidos"}
            {totalConcepts > 0 && ` · ${totalConcepts} conceptos extraídos`}
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
      {withPDF.length === 0 && (
        <div style={{
          background: "var(--card)", border: "1px solid var(--border)",
          borderRadius: "var(--radius-card)", padding: "64px 48px",
          textAlign: "center",
        }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>📄</div>
          <p style={{ fontWeight: 600, color: "var(--text)", marginBottom: 8, fontSize: 16 }}>
            Sin materiales aún
          </p>
          <p style={{ fontSize: 14, color: "var(--text-2)", marginBottom: 24 }}>
            Sube un PDF durante una clase activa y aparecerá aquí con su resumen generado por IA.
          </p>
          <Link href="/class/new" style={{ textDecoration: "none" }}>
            <button className="btn-accent" style={{
              background: "var(--accent)", color: "white", border: "none",
              borderRadius: "var(--radius-btn)", padding: "11px 24px",
              fontWeight: 600, fontSize: 14, cursor: "pointer",
            }}>
              Iniciar clase y subir material
            </button>
          </Link>
        </div>
      )}

      {/* Material grid */}
      {withPDF.length > 0 && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          gap: 16,
          alignItems: "start",
        }}>
          {withPDF.map((c, i) => {
            const col     = PDF_COLORS[i % PDF_COLORS.length];
            const date    = new Date(c.created_at).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
            const summary = c.data.material_summary || "";
            const preview = summary.length > 200 ? summary.slice(0, 200) + "…" : summary;
            const concepts = (c.data?.concepts || [])
              .map(x => typeof x === "string" ? x : x.name)
              .filter(Boolean)
              .slice(0, 4);

            return (
              <Link key={c.id} href={`/class/${c.id}`} style={{ textDecoration: "none" }}>
                <div className="card-lift" style={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-card)",
                  padding: "22px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                  cursor: "pointer",
                }}>

                  {/* Top: icon + title + badge */}
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 11, flexShrink: 0,
                      background: col.bg, color: col.fg,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <IcoFileText s={20} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontWeight: 600, fontSize: 14, color: "var(--text)",
                        lineHeight: 1.4, marginBottom: 5,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {c.title}
                      </p>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                        <span style={{
                          fontSize: 10, fontWeight: 700, letterSpacing: "0.05em",
                          background: col.bg, color: col.fg,
                          borderRadius: 99, padding: "2px 8px",
                          border: `1px solid ${col.fg}30`,
                        }}>
                          PDF
                        </span>
                        <span style={{ fontSize: 11, color: "var(--text-3)" }}>{date}</span>
                      </div>
                    </div>
                  </div>

                  {/* Summary preview */}
                  {preview && (
                    <p style={{
                      fontSize: 12.5, color: "var(--text-2)", lineHeight: 1.65,
                      flex: 1,
                    }}>
                      {preview}
                    </p>
                  )}

                  {/* Concept tags */}
                  {concepts.length > 0 && (
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                      {concepts.map((tag, j) => (
                        <span key={j} style={{
                          fontSize: 11, color: "var(--text-3)",
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.07)",
                          borderRadius: 99, padding: "2px 9px", fontWeight: 500,
                          maxWidth: 120, overflow: "hidden",
                          textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {tag}
                        </span>
                      ))}
                      {c.data?.concepts?.length > 4 && (
                        <span style={{ fontSize: 11, color: "var(--text-3)", alignSelf: "center" }}>
                          +{c.data.concepts.length - 4}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Footer */}
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "flex-end",
                    paddingTop: 10, borderTop: "1px solid var(--border)",
                  }}>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 4,
                      color: "var(--accent)", fontSize: 12, fontWeight: 600,
                    }}>
                      Ver clase <IcoChevRight s={12} />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
