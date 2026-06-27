"use client";
import { useState } from "react";

function Svg({ size = 16, children }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">{children}</svg>;
}
const IcoDownload = () => <Svg><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></Svg>;
const IcoFile     = () => <Svg><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></Svg>;

function download(filename, content, type = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function toCSV(rows) {
  return rows.map(r => r.map(cell => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
}

function buildAnkiCSV(concepts) {
  const rows = [["#separator:Comma", "#html:false", "#notetype:Basic", "#deck:VibeLearning", "Front", "Back"]];
  for (const c of concepts) {
    const name    = typeof c === "string" ? c : c.name;
    const summary = typeof c === "string" ? "" : (c.summary || "");
    if (name) rows.push([`¿Qué es ${name}?`, summary || name]);
  }
  return toCSV(rows);
}

function fmtDate(str) {
  return new Date(str).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

const EXPORT_TYPES = [
  {
    id: "anki",
    emoji: "🃏",
    name: "Flashcards para Anki",
    desc: "CSV listo para importar en Anki. Formato: pregunta / respuesta.",
    ext: ".csv",
    color: "#60A5FA",
    needs: c => c.concepts.length > 0,
    build: c => buildAnkiCSV(c.concepts),
    filename: c => `${c.title}_flashcards.csv`,
    type: "text/csv;charset=utf-8",
  },
  {
    id: "transcript",
    emoji: "📝",
    name: "Transcripción completa",
    desc: "El texto completo de la clase grabada en formato .txt.",
    ext: ".txt",
    color: "#A78BFA",
    needs: c => !!c.transcript,
    build: c => `${c.title}\n${"=".repeat(c.title.length)}\n${fmtDate(c.created_at)}\n\n${c.transcript}`,
    filename: c => `${c.title}_transcript.txt`,
    type: "text/plain;charset=utf-8",
  },
  {
    id: "summary",
    emoji: "📄",
    name: "Resumen high-yield",
    desc: "El resumen final generado por IA en formato .txt.",
    ext: ".txt",
    color: "#22C55E",
    needs: c => !!c.summary,
    build: c => `${c.title} — Resumen\n${fmtDate(c.created_at)}\n\n${c.summary}`,
    filename: c => `${c.title}_resumen.txt`,
    type: "text/plain;charset=utf-8",
  },
  {
    id: "mindmap",
    emoji: "🗺️",
    name: "Mapa mental (Markdown)",
    desc: "El mapa mental en formato Markdown compatible con Obsidian y otros.",
    ext: ".md",
    color: "#FBBF24",
    needs: c => !!c.mindmap,
    build: c => `# Mapa mental: ${c.title}\n\n${c.mindmap}`,
    filename: c => `${c.title}_mapa_mental.md`,
    type: "text/markdown;charset=utf-8",
  },
  {
    id: "concepts",
    emoji: "💡",
    name: "Conceptos JSON",
    desc: "Lista de conceptos con sus definiciones en formato JSON.",
    ext: ".json",
    color: "#EF4444",
    needs: c => c.concepts.length > 0,
    build: c => JSON.stringify({ title: c.title, date: c.created_at, concepts: c.concepts }, null, 2),
    filename: c => `${c.title}_conceptos.json`,
    type: "application/json",
  },
];

export default function ExportarClient({ classes }) {
  const [selId,  setSelId]  = useState(classes[0]?.id ?? null);
  const [dled,   setDled]   = useState(new Set());
  const [search, setSearch] = useState("");

  const sel = classes.find(c => c.id === selId);
  const filtered = classes.filter(c => c.title.toLowerCase().includes(search.toLowerCase()));

  function doDownload(type) {
    if (!sel) return;
    download(type.filename(sel), type.build(sel), type.type);
    setDled(prev => new Set([...prev, type.id]));
    setTimeout(() => setDled(prev => { const n = new Set(prev); n.delete(type.id); return n; }), 1500);
  }

  function downloadAll() {
    if (!sel) return;
    for (const t of EXPORT_TYPES) {
      if (t.needs(sel)) doDownload(t);
    }
  }

  return (
    <div style={{ display: "flex", gap: 20, flex: 1, minHeight: 0 }}>

      {/* Left: class selector */}
      <div style={{ width: 256, flexShrink: 0, background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-card)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "12px 14px 8px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>Selecciona clase</p>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar…"
            style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: 9, padding: "7px 12px", fontSize: 12, color: "var(--text)", outline: "none", boxSizing: "border-box" }}
          />
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
          {classes.length === 0 && (
            <p style={{ fontSize: 12, color: "var(--text-3)", textAlign: "center", padding: "24px 12px" }}>No hay clases</p>
          )}
          {filtered.map(c => {
            const on = c.id === selId;
            return (
              <button key={c.id} onClick={() => setSelId(c.id)} style={{
                width: "100%", textAlign: "left",
                background: on ? "var(--accent-dim)" : "transparent",
                border: `1px solid ${on ? "rgba(124,108,248,0.25)" : "transparent"}`,
                borderRadius: 10, padding: "9px 12px", marginBottom: 3, cursor: "pointer",
              }}>
                <p style={{ fontSize: 13, fontWeight: on ? 600 : 400, color: on ? "var(--accent)" : "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title}</p>
                <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>{fmtDate(c.created_at)}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right: export options */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
        {sel ? (
          <>
            {/* Header */}
            <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-card)", padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <p style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>{sel.title}</p>
                <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 3 }}>
                  {fmtDate(sel.created_at)} · {sel.concepts.length} conceptos
                  {sel.transcript && ` · ${Math.round(sel.transcript.split(/\s+/).length / 130)} min`}
                </p>
              </div>
              <button onClick={downloadAll} style={{
                display: "flex", alignItems: "center", gap: 7,
                background: "var(--accent)", color: "white", border: "none",
                borderRadius: 10, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}>
                <IcoDownload /> Descargar todo
              </button>
            </div>

            {/* Export cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
              {EXPORT_TYPES.map(t => {
                const available = t.needs(sel);
                const done = dled.has(t.id);
                return (
                  <div key={t.id} style={{
                    background: "var(--card)", border: `1px solid ${available ? "var(--border)" : "rgba(255,255,255,0.04)"}`,
                    borderRadius: "var(--radius-card)", padding: "20px 22px",
                    opacity: available ? 1 : 0.4,
                  }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 14 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: `${t.color}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
                        {t.emoji}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{t.name}</p>
                        <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 3, lineHeight: 1.5 }}>{t.desc}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => doDownload(t)}
                      disabled={!available}
                      style={{
                        width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                        background: done ? "rgba(34,197,94,0.12)" : available ? `${t.color}15` : "rgba(255,255,255,0.03)",
                        border: `1px solid ${done ? "rgba(34,197,94,0.25)" : available ? t.color + "30" : "var(--border)"}`,
                        borderRadius: 9, padding: "9px 14px", fontSize: 12, fontWeight: 600,
                        color: done ? "#22C55E" : available ? t.color : "var(--text-3)",
                        cursor: available ? "pointer" : "not-allowed",
                        transition: "all 150ms",
                      }}
                    >
                      {done ? "✓ Descargado" : <><IcoDownload /> Descargar {t.ext}</>}
                    </button>
                    {!available && (
                      <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 8, textAlign: "center" }}>
                        No disponible para esta clase
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Anki instructions */}
            <div style={{ background: "rgba(96,165,250,0.05)", border: "1px solid rgba(96,165,250,0.15)", borderRadius: "var(--radius-card)", padding: "16px 20px" }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#60A5FA", marginBottom: 6 }}>Cómo importar en Anki</p>
              <p style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.65 }}>
                Descarga el CSV de flashcards → Anki → Archivo → Importar → selecciona el archivo. Las columnas ya están configuradas correctamente. El mazo se llamará "VibeLearning".
              </p>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-card)" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 44, marginBottom: 16 }}>📦</div>
              <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>Selecciona una clase</p>
              <p style={{ fontSize: 13, color: "var(--text-2)" }}>Elige una clase de la izquierda para ver las opciones de exportación</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
