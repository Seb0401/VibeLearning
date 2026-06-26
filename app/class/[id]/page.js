import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import MindMap from "@/components/MindMap";
import ReactMarkdown from "react-markdown";

/* ── SVG icon helper ───────────────────────────────────────────────────── */
function RI({ s = 16, children }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

const PALETTE = [
  { bg: "rgba(124,108,248,0.1)", fg: "#A78BFA" },
  { bg: "rgba(96,165,250,0.1)",  fg: "#60A5FA" },
  { bg: "rgba(34,197,94,0.1)",   fg: "#22C55E" },
  { bg: "rgba(251,191,36,0.1)",  fg: "#FBBF24" },
  { bg: "rgba(239,68,68,0.1)",   fg: "#EF4444" },
  { bg: "rgba(20,184,166,0.1)",  fg: "#2DD4BF" },
];

/* ── Helpers ───────────────────────────────────────────────────────────── */
function estimateDuration(transcript) {
  if (!transcript) return null;
  const m = Math.round(transcript.trim().split(/\s+/).filter(Boolean).length / 130);
  return m >= 1 ? `${m} min` : null;
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("es-MX", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

function summaryExcerpt(text) {
  const paras = (text || "")
    .split(/\n{2,}/)
    .map(p => p.trim().replace(/^#+\s*/, "").replace(/\*\*/g, "").trim())
    .filter(p => p.length > 40 && !p.startsWith("-") && !p.startsWith("•"));
  return paras[0]?.slice(0, 155) || null;
}

/* ── Page ──────────────────────────────────────────────────────────────── */
export default async function ClassPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: cls } = await supabase
    .from("classes")
    .select("*")
    .eq("id", id)
    .single();

  if (!cls) notFound();

  const { transcript, concepts = [], material_summary, final_summary, final_mindmap, visual_notes = [] } = cls.data ?? {};
  const duration   = estimateDuration(transcript);
  const classDate  = formatDate(cls.created_at);
  const excerpt    = summaryExcerpt(final_summary);
  const transcriptLines = transcript
    ? transcript.trim().split(/\n+/).filter(Boolean).map(t => t.trim())
    : [];

  // Get signed URLs for stored images (1h expiry)
  const notesWithUrls = await Promise.all(
    visual_notes.map(async (note) => {
      if (!note.storagePath) return { ...note, imageUrl: null };
      const { data } = await supabase.storage
        .from("class-images")
        .createSignedUrl(note.storagePath, 3600);
      return { ...note, imageUrl: data?.signedUrl || null };
    })
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", paddingBottom: 96 }}>
      <div style={{ maxWidth: 1060, margin: "0 auto", padding: "48px 36px 0" }}>

        {/* ── 1. HERO ─────────────────────────────────────────────────── */}
        <div style={{
          background: "linear-gradient(135deg, rgba(124,108,248,0.09) 0%, #171721 55%)",
          border: "1px solid rgba(124,108,248,0.18)",
          borderRadius: 20, padding: "40px 44px",
          marginBottom: 24, position: "relative", overflow: "hidden",
        }}>
          <div style={{ position: "absolute", top: -80, right: -80, width: 360, height: 360, borderRadius: "50%", background: "radial-gradient(circle, rgba(124,108,248,0.07), transparent 70%)", pointerEvents: "none" }} />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 32 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(34,197,94,0.1)", color: "#22C55E", border: "1px solid rgba(34,197,94,0.2)", fontSize: 12, fontWeight: 600, borderRadius: 99, padding: "5px 13px", marginBottom: 20, letterSpacing: "0.02em" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22C55E", display: "inline-block" }} />
                Clase guardada
              </span>
              <h1 style={{ fontSize: 30, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.025em", lineHeight: 1.2, marginBottom: 16 }}>
                {cls.title}
              </h1>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 16, color: "var(--text-2)", fontSize: 13, marginBottom: excerpt ? 20 : 0 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <RI s={13}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></RI>
                  {classDate}
                </span>
                {duration && <><span style={{ opacity: 0.25 }}>·</span><span style={{ display: "flex", alignItems: "center", gap: 5 }}><RI s={13}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></RI>{duration}</span></>}
                {concepts.length > 0 && <><span style={{ opacity: 0.25 }}>·</span><span style={{ display: "flex", alignItems: "center", gap: 5 }}><RI s={13}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></RI>{concepts.length} conceptos</span></>}
              </div>
              {excerpt && <p style={{ fontSize: 14, color: "var(--text-2)", lineHeight: 1.75, maxWidth: 560, fontStyle: "italic", opacity: 0.8 }}>"{excerpt}{excerpt.length >= 155 ? "..." : ""}"</p>}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, flexShrink: 0 }}>
              <Link href="/dashboard" style={{ textDecoration: "none" }}>
                <button className="btn-ghost" style={{ background: "transparent", color: "var(--text-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-btn)", padding: "11px 22px", fontWeight: 500, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" }}>
                  <RI s={15}><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></RI>
                  Dashboard
                </button>
              </Link>
              {transcript && (
                <a
                  href={`data:text/plain;charset=utf-8,${encodeURIComponent(transcript)}`}
                  download={`${cls.title}.txt`}
                  style={{ textDecoration: "none" }}
                >
                  <button className="btn-accent" style={{ background: "var(--accent)", color: "white", border: "none", borderRadius: "var(--radius-btn)", padding: "11px 22px", fontWeight: 600, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap", width: "100%" }}>
                    <RI s={15}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></RI>
                    Descargar transcript
                  </button>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* ── 2. MÉTRICAS ─────────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
          {[
            { icon: <RI s={20}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></RI>, bg: "rgba(124,108,248,0.12)", fg: "var(--accent)", label: "Conceptos aprendidos", val: concepts.length || 0 },
            { icon: <RI s={20}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></RI>, bg: "rgba(96,165,250,0.12)", fg: "#60A5FA", label: "Duración estimada", val: duration || "—" },
            { icon: <RI s={20}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></RI>, bg: "rgba(34,197,94,0.12)", fg: "var(--green)", label: "Líneas de transcript", val: transcriptLines.length || 0 },
            { icon: <RI s={20}><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></RI>, bg: material_summary ? "rgba(251,191,36,0.12)" : "rgba(255,255,255,0.04)", fg: material_summary ? "var(--yellow)" : "var(--text-3)", label: "Material de apoyo", val: material_summary ? "Incluido" : "Sin material" },
          ].map(({ icon, bg, fg, label, val }, i) => (
            <div key={i} className="stat-lift" style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, padding: "24px" }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: bg, color: fg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>{icon}</div>
              <p style={{ fontSize: 26, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em", lineHeight: 1, marginBottom: 6 }}>{val}</p>
              <p style={{ fontSize: 12, fontWeight: 500, color: "var(--text-2)" }}>{label}</p>
            </div>
          ))}
        </div>

        {/* ── 3. RESUMEN IA ───────────────────────────────────────────── */}
        {final_summary && (
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, padding: "32px 36px", marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--accent-dim)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <RI s={18}><path d="m12 3-1.9 5.8a2 2 0 0 1-1.287 1.288L3 12l5.8 1.9a2 2 0 0 1 1.288 1.287L12 21l1.9-5.8a2 2 0 0 1 1.287-1.288L21 12l-5.8-1.9a2 2 0 0 1-1.288-1.287Z"/></RI>
                </div>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>Resumen generado por IA</h2>
                  <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>Análisis de tu sesión de aprendizaje</p>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {concepts.length > 0 && <span style={{ fontSize: 11, fontWeight: 600, color: "var(--accent)", background: "var(--accent-dim)", borderRadius: 99, padding: "4px 10px" }}>{concepts.length} conceptos</span>}
                {duration && <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-2)", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", borderRadius: 99, padding: "4px 10px" }}>{duration}</span>}
              </div>
            </div>
            <div style={{ height: 1, background: "var(--border)", marginBottom: 24 }} />
            <div style={{ fontSize: 15, color: "var(--text-2)", lineHeight: 1.8 }}>
              <ReactMarkdown
                components={{
                  h1: ({children}) => <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", margin: "24px 0 12px", letterSpacing: "-0.02em" }}>{children}</h1>,
                  h2: ({children}) => <h2 style={{ fontSize: 17, fontWeight: 600, color: "var(--text)", margin: "20px 0 10px" }}>{children}</h2>,
                  h3: ({children}) => <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-2)", margin: "16px 0 8px" }}>{children}</h3>,
                  p:  ({children}) => <p style={{ margin: "0 0 14px", color: "var(--text-2)", lineHeight: 1.8 }}>{children}</p>,
                  strong: ({children}) => <strong style={{ color: "var(--text)", fontWeight: 600 }}>{children}</strong>,
                  ul: ({children}) => <ul style={{ paddingLeft: 22, margin: "0 0 14px" }}>{children}</ul>,
                  ol: ({children}) => <ol style={{ paddingLeft: 22, margin: "0 0 14px" }}>{children}</ol>,
                  li: ({children}) => <li style={{ marginBottom: 6, color: "var(--text-2)" }}>{children}</li>,
                  code: ({children}) => <code style={{ background: "rgba(124,108,248,0.1)", color: "var(--accent)", borderRadius: 4, padding: "2px 6px", fontSize: "0.88em" }}>{children}</code>,
                }}
              >
                {final_summary}
              </ReactMarkdown>
            </div>
          </div>
        )}

        {/* ── 4. MAPA MENTAL ──────────────────────────────────────────── */}
        {final_mindmap && (
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, padding: "28px 32px", marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(96,165,250,0.1)", color: "#60A5FA", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <RI s={18}><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></RI>
              </div>
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>Mapa mental</h2>
                <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>Visualización de conceptos y relaciones</p>
              </div>
            </div>
            <MindMap markdown={final_mindmap} />
          </div>
        )}

        {/* ── 5. CONCEPTOS ────────────────────────────────────────────── */}
        {concepts.length > 0 && (
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, padding: "28px 32px", marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--accent-dim)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <RI s={18}><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></RI>
              </div>
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>Conceptos de la clase</h2>
                <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>{concepts.length} detectados por IA</p>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {concepts.map((c, i) => {
                const pal  = PALETTE[i % PALETTE.length];
                const name = typeof c === "string" ? c : c.name;
                const sum  = typeof c === "object" ? c.summary : "";
                return (
                  <div key={i} style={{ display: "flex", gap: 12, padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: pal.fg, flexShrink: 0, marginTop: 6 }} />
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{name}</p>
                      {sum && <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4, lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{sum}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── 5.5 NOTAS VISUALES ──────────────────────────────────────── */}
        {notesWithUrls.length > 0 && (
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, padding: "28px 32px", marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(96,165,250,0.1)", color: "#60A5FA", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <RI s={18}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 0 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></RI>
              </div>
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>Notas visuales de la clase</h2>
                <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>{notesWithUrls.length} imagen{notesWithUrls.length !== 1 ? "es" : ""} analizadas por Gemini</p>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
              {notesWithUrls.map((note, i) => (
                <div key={i} style={{ borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden", background: "rgba(255,255,255,0.02)" }}>
                  {note.imageUrl && (
                    <img src={note.imageUrl} alt="" style={{ width: "100%", height: 140, objectFit: "cover", display: "block" }} />
                  )}
                  <div style={{ padding: "12px 14px" }}>
                    {note.key_concepts?.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
                        {note.key_concepts.map((kc, j) => (
                          <span key={j} style={{ fontSize: 10, fontWeight: 600, color: "var(--accent)", background: "var(--accent-dim)", borderRadius: 99, padding: "2px 8px" }}>{kc}</span>
                        ))}
                      </div>
                    )}
                    <p style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.6, marginBottom: note.gaps ? 8 : 0 }}>{note.description}</p>
                    {note.gaps && (
                      <div style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.18)", borderRadius: 8, padding: "7px 10px" }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: "var(--yellow)", marginBottom: 3 }}>⚠ Información visual no verbalizada</p>
                        <p style={{ fontSize: 11, color: "var(--text-2)", lineHeight: 1.5 }}>{note.gaps}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 6. MATERIAL ─────────────────────────────────────────────── */}
        {material_summary && (
          <div style={{ background: "var(--card)", border: "1px solid rgba(251,191,36,0.12)", borderRadius: 16, padding: "28px 32px", marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(251,191,36,0.1)", color: "var(--yellow)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <RI s={18}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></RI>
                </div>
                <div>
                  <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>Material de apoyo</h2>
                  <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>Resumen del PDF cargado en clase</p>
                </div>
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: "var(--yellow)", background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.15)", borderRadius: 99, padding: "3px 9px", letterSpacing: "0.05em" }}>PDF</span>
            </div>
            <p style={{ fontSize: 14, color: "var(--text-2)", lineHeight: 1.75 }}>{material_summary}</p>
          </div>
        )}

        {/* ── 7. TRANSCRIPT ───────────────────────────────────────────── */}
        {transcript && (
          <details style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, marginBottom: 24, overflow: "hidden" }}>
            <summary style={{ padding: "20px 28px", cursor: "pointer", listStyle: "none", display: "flex", alignItems: "center", justifyContent: "space-between", userSelect: "none" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 9, color: "var(--text-2)", fontSize: 14, fontWeight: 500 }}>
                <RI s={16}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></RI>
                Transcript completo
              </span>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <a
                  href={`data:text/plain;charset=utf-8,${encodeURIComponent(transcript)}`}
                  download={`${cls.title}.txt`}
                  onClick={e => e.stopPropagation()}
                  style={{ fontSize: 11, color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}
                >
                  Descargar .txt
                </a>
                <span style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 500 }}>Ver / ocultar</span>
              </div>
            </summary>
            <div style={{ padding: "0 28px 24px", maxHeight: 440, overflowY: "auto", borderTop: "1px solid var(--border)" }}>
              <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.8, marginTop: 20, whiteSpace: "pre-wrap" }}>{transcript}</p>
            </div>
          </details>
        )}

        {/* ── 8. SIGUIENTE PASO ───────────────────────────────────────── */}
        <div style={{ background: "linear-gradient(135deg, rgba(124,108,248,0.1) 0%, #171721 60%)", border: "1px solid rgba(124,108,248,0.2)", borderRadius: 20, padding: "36px 40px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24 }}>
          <div>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--accent)", letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Siguiente paso</span>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em", marginBottom: 8 }}>¿Listo para seguir aprendiendo?</h2>
            <p style={{ fontSize: 14, color: "var(--text-2)", lineHeight: 1.65, maxWidth: 400 }}>Sigue estudiando desde el dashboard o inicia una nueva clase.</p>
          </div>
          <div style={{ display: "flex", gap: 12, flexShrink: 0 }}>
            <Link href="/class/new" style={{ textDecoration: "none" }}>
              <button className="btn-accent" style={{ background: "var(--accent)", color: "white", border: "none", borderRadius: "var(--radius-btn)", padding: "12px 24px", fontWeight: 600, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>
                <RI s={15}><polygon points="5 3 19 12 5 21 5 3"/></RI> Nueva clase
              </button>
            </Link>
            <Link href="/dashboard" style={{ textDecoration: "none" }}>
              <button className="btn-ghost" style={{ background: "transparent", color: "var(--text-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-btn)", padding: "12px 24px", fontWeight: 500, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" }}>
                Ir al dashboard <RI s={15}><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></RI>
              </button>
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
