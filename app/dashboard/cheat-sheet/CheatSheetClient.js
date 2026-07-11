"use client";
import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";

function fmtDate(str) {
  return new Date(str).toLocaleDateString("es-MX", { day: "numeric", month: "short", timeZone: "UTC" });
}

function Checkbox({ on }) {
  return (
    <div style={{
      width: 16, height: 16, borderRadius: 4, flexShrink: 0, marginTop: 1,
      border: `1.5px solid ${on ? "var(--accent)" : "var(--border)"}`,
      background: on ? "var(--accent)" : "transparent",
      display: "flex", alignItems: "center", justifyContent: "center",
      transition: "all 140ms",
    }}>
      {on && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
    </div>
  );
}

export default function CheatSheetClient({ classes }) {
  const [mode,          setMode]          = useState("clases"); // "clases" | "cursos"
  const [courses,       setCourses]       = useState([]);
  const [activeCourse,  setActiveCourse]  = useState(null);
  const [selected,      setSelected]      = useState(new Set());
  const [loading,       setLoading]       = useState(false);
  const [markdown,      setMarkdown]      = useState("");
  const [copied,        setCopied]        = useState(false);
  const [search,        setSearch]        = useState("");

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("cursos_v1") || "[]");
      setCourses(stored);
    } catch {}
  }, []);

  const filtered = classes.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  function toggle(id) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function pickCourse(course) {
    if (activeCourse?.id === course.id) {
      setActiveCourse(null);
      setSelected(new Set());
    } else {
      setActiveCourse(course);
      setSelected(new Set(course.classIds || []));
    }
  }

  function switchMode(m) {
    setMode(m);
    setSelected(new Set());
    setActiveCourse(null);
    setSearch("");
  }

  async function generate() {
    const chosen = classes.filter(c => selected.has(c.id));
    if (!chosen.length) return;
    setLoading(true);
    setMarkdown("");
    const body = {
      title: chosen.length === 1
        ? chosen[0].title
        : chosen.map(c => c.title).join(" + "),
      concepts:   chosen.flatMap(c => c.concepts),
      transcript: chosen
        .map(c => c.transcript.split(/\s+/).slice(0, 400).join(" "))
        .join("\n\n"),
    };
    try {
      const res  = await fetch("/api/cheat-sheet", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      setMarkdown(data.markdown || "");
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const hasSelection = selected.size > 0;

  return (
    <div style={{ display: "flex", gap: 20, flex: 1, minHeight: 0 }}>

      {/* ── LEFT: selector ── */}
      <div style={{
        width: 288, flexShrink: 0,
        background: "var(--card)", border: "1px solid var(--border)",
        borderRadius: "var(--radius-card)", display: "flex", flexDirection: "column",
        overflow: "hidden",
      }}>
        {/* Mode tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          {[["clases", "Clases"], ["cursos", "Cursos"]].map(([key, label]) => (
            <button key={key} onClick={() => switchMode(key)} style={{
              flex: 1, padding: "11px 0", fontSize: 12, fontWeight: mode === key ? 700 : 400,
              color: mode === key ? "var(--accent)" : "var(--text-3)",
              background: "none", border: "none", cursor: "pointer",
              borderBottom: `2px solid ${mode === key ? "var(--accent)" : "transparent"}`,
              transition: "all 140ms",
            }}>
              {label}
            </button>
          ))}
        </div>

        {/* Selection count */}
        <div style={{ padding: "10px 16px 6px", flexShrink: 0 }}>
          <p style={{ fontSize: 11, color: "var(--text-3)" }}>
            {selected.size === 0
              ? "Nada seleccionado"
              : `${selected.size} clase${selected.size > 1 ? "s" : ""} seleccionada${selected.size > 1 ? "s" : ""}`}
          </p>
        </div>

        {/* ── COURSES MODE ── */}
        {mode === "cursos" && (
          <div style={{ flex: 1, overflowY: "auto", padding: 10 }}>
            {courses.length === 0 ? (
              <p style={{ fontSize: 12, color: "var(--text-3)", textAlign: "center", padding: "28px 12px", lineHeight: 1.6 }}>
                Sin cursos creados.<br />Ve a <strong>Cursos</strong> para crear uno.
              </p>
            ) : (
              courses.map(course => {
                const courseClasses = classes.filter(c => (course.classIds || []).includes(c.id));
                const isActive = activeCourse?.id === course.id;
                return (
                  <div key={course.id}>
                    {/* Course header */}
                    <div
                      onClick={() => pickCourse(course)}
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "9px 10px", borderRadius: 10, marginBottom: 4,
                        cursor: "pointer",
                        background: isActive ? "var(--accent-dim)" : "transparent",
                        border: `1px solid ${isActive ? "rgba(124,108,248,0.28)" : "transparent"}`,
                        transition: "all 140ms",
                      }}
                    >
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: course.color || "var(--accent)", flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: isActive ? "var(--accent)" : "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {course.title}
                        </p>
                        <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 1 }}>
                          {courseClasses.length} clase{courseClasses.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <Checkbox on={isActive} />
                    </div>

                    {/* Individual classes under selected course */}
                    {isActive && courseClasses.map(c => {
                      const on = selected.has(c.id);
                      return (
                        <div key={c.id} onClick={() => toggle(c.id)} style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "7px 10px 7px 24px", borderRadius: 8, marginBottom: 2,
                          cursor: "pointer",
                          background: on ? "rgba(124,108,248,0.06)" : "transparent",
                          transition: "all 140ms",
                        }}>
                          <Checkbox on={on} />
                          <p style={{ fontSize: 12, color: on ? "var(--text)" : "var(--text-2)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {c.title}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── CLASSES MODE ── */}
        {mode === "clases" && (
          <>
            <div style={{ padding: "0 12px 8px", flexShrink: 0 }}>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar…"
                style={{
                  width: "100%", background: "rgba(255,255,255,0.04)",
                  border: "1px solid var(--border)", borderRadius: 9,
                  padding: "7px 12px", fontSize: 12, color: "var(--text)",
                  outline: "none", boxSizing: "border-box",
                }}
              />
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "0 10px" }}>
              {classes.length === 0 && (
                <p style={{ fontSize: 12, color: "var(--text-3)", textAlign: "center", padding: "24px 12px" }}>
                  No hay clases aún
                </p>
              )}
              {filtered.map(c => {
                const on = selected.has(c.id);
                return (
                  <div key={c.id} onClick={() => toggle(c.id)} style={{
                    display: "flex", alignItems: "flex-start", gap: 10,
                    padding: "9px 10px", borderRadius: 10, marginBottom: 4,
                    cursor: "pointer",
                    background: on ? "var(--accent-dim)" : "transparent",
                    border: `1px solid ${on ? "rgba(124,108,248,0.28)" : "transparent"}`,
                    transition: "all 140ms",
                  }}>
                    <Checkbox on={on} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: on ? "var(--accent)" : "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {c.title}
                      </p>
                      <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>
                        {c.concepts.length} conceptos · {fmtDate(c.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Generate button */}
        <div style={{ padding: 12, borderTop: "1px solid var(--border)", flexShrink: 0 }}>
          <button
            onClick={generate}
            disabled={!hasSelection || loading}
            style={{
              width: "100%", background: hasSelection ? "var(--accent)" : "rgba(124,108,248,0.2)",
              color: "white", border: "none", borderRadius: 10,
              padding: "11px 16px", fontSize: 13, fontWeight: 600,
              cursor: !hasSelection || loading ? "not-allowed" : "pointer",
              opacity: !hasSelection ? 0.5 : 1,
              transition: "all 150ms",
            }}
          >
            {loading ? "Generando…" : "Generar cheat sheet"}
          </button>
        </div>
      </div>

      {/* ── RIGHT: output ── */}
      <div style={{
        flex: 1, background: "var(--card)", border: "1px solid var(--border)",
        borderRadius: "var(--radius-card)", display: "flex", flexDirection: "column",
        overflow: "hidden",
      }}>
        {markdown && !loading && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, padding: "11px 20px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
            <button onClick={copy} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", borderRadius: 9, padding: "7px 14px", fontSize: 12, fontWeight: 500, color: copied ? "var(--green)" : "var(--text-2)", cursor: "pointer" }}>
              {copied ? "✓ Copiado" : "Copiar"}
            </button>
            <button onClick={() => window.print()} style={{ background: "var(--accent)", border: "none", borderRadius: 9, padding: "7px 16px", fontSize: 12, fontWeight: 600, color: "white", cursor: "pointer" }}>
              Imprimir / PDF
            </button>
          </div>
        )}
        <div style={{ flex: 1, overflowY: "auto", padding: "28px 36px" }}>
          {loading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 36, marginBottom: 14 }}>⚡</div>
                <p style={{ fontSize: 14, color: "var(--text-2)" }}>Generando tu cheat sheet…</p>
                <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 6 }}>Puede tardar 5-10 segundos</p>
              </div>
            </div>
          ) : markdown ? (
            <div style={{ color: "var(--text)", fontSize: 14, lineHeight: 1.75 }}>
              <ReactMarkdown components={{
                h2: ({children}) => <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", marginTop: 24, marginBottom: 10, paddingBottom: 6, borderBottom: "1px solid var(--border)" }}>{children}</h2>,
                h3: ({children}) => <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginTop: 16, marginBottom: 6 }}>{children}</h3>,
                ul: ({children}) => <ul style={{ paddingLeft: 20, marginTop: 6, marginBottom: 12 }}>{children}</ul>,
                li: ({children}) => <li style={{ color: "var(--text-2)", marginBottom: 4, fontSize: 13 }}>{children}</li>,
                strong: ({children}) => <strong style={{ color: "var(--text)", fontWeight: 600 }}>{children}</strong>,
                p: ({children}) => <p style={{ color: "var(--text-2)", marginBottom: 8, fontSize: 13 }}>{children}</p>,
                code: ({children}) => <code style={{ background: "rgba(124,108,248,0.1)", color: "var(--accent)", borderRadius: 4, padding: "1px 6px", fontSize: 12 }}>{children}</code>,
              }}>
                {markdown}
              </ReactMarkdown>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
              <div style={{ textAlign: "center", maxWidth: 340 }}>
                <div style={{ fontSize: 44, marginBottom: 18 }}>📋</div>
                <p style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", marginBottom: 10 }}>Tu cheat sheet aparecerá aquí</p>
                <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.7 }}>
                  Selecciona clases o un curso a la izquierda y presiona{" "}
                  <strong style={{ color: "var(--accent)" }}>Generar cheat sheet</strong>.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
