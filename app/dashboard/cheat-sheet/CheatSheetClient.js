"use client";
import { useState } from "react";
import ReactMarkdown from "react-markdown";

function fmtDate(str) {
  return new Date(str).toLocaleDateString("es-MX", { day: "numeric", month: "short", timeZone: "UTC" });
}

export default function CheatSheetClient({ classes }) {
  const [selected, setSelected] = useState(new Set());
  const [loading,  setLoading]  = useState(false);
  const [markdown, setMarkdown] = useState("");
  const [copied,   setCopied]   = useState(false);
  const [search,   setSearch]   = useState("");

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
      const res = await fetch("/api/cheat-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
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

      {/* Left: class selector */}
      <div style={{
        width: 280, flexShrink: 0,
        background: "var(--card)", border: "1px solid var(--border)",
        borderRadius: "var(--radius-card)", display: "flex", flexDirection: "column",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>
            Selecciona clases
          </p>
          <p style={{ fontSize: 11, color: "var(--text-3)" }}>
            {selected.size === 0 ? "Ninguna seleccionada" : `${selected.size} seleccionada${selected.size > 1 ? "s" : ""}`}
          </p>
        </div>

        {/* Search */}
        <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
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

        {/* List */}
        <div style={{ flex: 1, overflowY: "auto", padding: 10 }}>
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
                {/* Checkbox */}
                <div style={{
                  width: 16, height: 16, borderRadius: 4, flexShrink: 0, marginTop: 1,
                  border: `1.5px solid ${on ? "var(--accent)" : "var(--border)"}`,
                  background: on ? "var(--accent)" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 140ms",
                }}>
                  {on && (
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{
                    fontSize: 13, fontWeight: 500,
                    color: on ? "var(--accent)" : "var(--text)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
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

      {/* Right: output */}
      <div style={{
        flex: 1, background: "var(--card)", border: "1px solid var(--border)",
        borderRadius: "var(--radius-card)", display: "flex", flexDirection: "column",
        overflow: "hidden",
      }}>
        {/* Toolbar (only when content exists) */}
        {markdown && !loading && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8,
            padding: "11px 20px", borderBottom: "1px solid var(--border)", flexShrink: 0,
          }}>
            <button onClick={copy} style={{
              background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)",
              borderRadius: 9, padding: "7px 14px", fontSize: 12, fontWeight: 500,
              color: copied ? "var(--green)" : "var(--text-2)", cursor: "pointer",
            }}>
              {copied ? "✓ Copiado" : "Copiar"}
            </button>
            <button onClick={() => window.print()} style={{
              background: "var(--accent)", border: "none",
              borderRadius: 9, padding: "7px 16px", fontSize: 12, fontWeight: 600,
              color: "white", cursor: "pointer",
            }}>
              Imprimir / PDF
            </button>
          </div>
        )}

        {/* Content */}
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
            <div style={{
              color: "var(--text)", fontSize: 14, lineHeight: 1.75,
              "--tw-prose-headings": "var(--text)",
            }}>
              <ReactMarkdown
                components={{
                  h2: ({children}) => <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", marginTop: 24, marginBottom: 10, paddingBottom: 6, borderBottom: "1px solid var(--border)" }}>{children}</h2>,
                  h3: ({children}) => <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginTop: 16, marginBottom: 6 }}>{children}</h3>,
                  ul: ({children}) => <ul style={{ paddingLeft: 20, marginTop: 6, marginBottom: 12 }}>{children}</ul>,
                  li: ({children}) => <li style={{ color: "var(--text-2)", marginBottom: 4, fontSize: 13 }}>{children}</li>,
                  strong: ({children}) => <strong style={{ color: "var(--text)", fontWeight: 600 }}>{children}</strong>,
                  p: ({children}) => <p style={{ color: "var(--text-2)", marginBottom: 8, fontSize: 13 }}>{children}</p>,
                  code: ({children}) => <code style={{ background: "rgba(124,108,248,0.1)", color: "var(--accent)", borderRadius: 4, padding: "1px 6px", fontSize: 12 }}>{children}</code>,
                }}
              >
                {markdown}
              </ReactMarkdown>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
              <div style={{ textAlign: "center", maxWidth: 340 }}>
                <div style={{ fontSize: 44, marginBottom: 18 }}>📋</div>
                <p style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", marginBottom: 10 }}>
                  Tu cheat sheet aparecerá aquí
                </p>
                <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.7 }}>
                  Selecciona una o más clases a la izquierda y presiona{" "}
                  <strong style={{ color: "var(--accent)" }}>Generar cheat sheet</strong>.
                  La IA extrae los conceptos más importantes en formato compacto para repasar o imprimir.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
