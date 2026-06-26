"use client";
import { useState } from "react";
import MindMap from "@/components/MindMap";

function Icon({ size = 16, children }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}
const IcoShare2 = ({ s }) => <Icon size={s}><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></Icon>;
const IcoList   = ({ s }) => <Icon size={s}><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></Icon>;

export default function MapaGlobalClient({ classes, markdown }) {
  const [view,     setView]     = useState("map");       // "map" | "list"
  const [selected, setSelected] = useState(null);        // classId filter

  const filteredMd = selected
    ? buildMarkdown(classes.filter(c => c.id === selected))
    : markdown;

  const totalConcepts = classes.reduce((s, c) => s + (c.data?.concepts?.length || 0), 0);

  return (
    <div style={{ padding: "40px 48px", display: "flex", flexDirection: "column", gap: 24, height: "calc(100vh - 1px)", boxSizing: "border-box" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em" }}>
            Mapa de conocimiento global
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-2)", marginTop: 6 }}>
            {classes.length} clases · {totalConcepts} conceptos
          </p>
        </div>

        {/* View toggle */}
        <div style={{ display: "flex", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: 4, gap: 2 }}>
          {[
            { id: "map",  icon: <IcoShare2 s={15} />, label: "Mapa"  },
            { id: "list", icon: <IcoList   s={15} />, label: "Lista" },
          ].map(({ id, icon, label }) => (
            <button key={id} onClick={() => setView(id)} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 14px", borderRadius: 9, border: "none",
              background: view === id ? "var(--accent-dim)" : "transparent",
              color: view === id ? "var(--accent)" : "var(--text-2)",
              fontSize: 13, fontWeight: view === id ? 600 : 400, cursor: "pointer",
              transition: "all 150ms",
            }}>
              {icon} {label}
            </button>
          ))}
        </div>
      </div>

      {/* Class filter pills */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", flexShrink: 0 }}>
        <button onClick={() => setSelected(null)} style={{
          padding: "5px 14px", borderRadius: 99, border: "none",
          background: !selected ? "var(--accent)" : "rgba(255,255,255,0.06)",
          color: !selected ? "white" : "var(--text-2)",
          fontSize: 12, fontWeight: !selected ? 600 : 400, cursor: "pointer",
        }}>
          Todas las clases
        </button>
        {classes.map(c => (
          <button key={c.id} onClick={() => setSelected(c.id === selected ? null : c.id)} style={{
            padding: "5px 14px", borderRadius: 99, border: "none",
            background: selected === c.id ? "var(--accent)" : "rgba(255,255,255,0.06)",
            color: selected === c.id ? "white" : "var(--text-2)",
            fontSize: 12, fontWeight: selected === c.id ? 600 : 400, cursor: "pointer",
            maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {c.title}
          </button>
        ))}
      </div>

      {/* Map or List */}
      {classes.length === 0 ? (
        <div style={{
          flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
          background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-card)",
        }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🗺️</div>
            <p style={{ fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>Sin conceptos aún</p>
            <p style={{ fontSize: 13, color: "var(--text-2)" }}>Completa clases para construir tu mapa de conocimiento.</p>
          </div>
        </div>
      ) : view === "map" ? (
        <div style={{
          flex: 1, background: "var(--card)", border: "1px solid var(--border)",
          borderRadius: "var(--radius-card)", overflow: "hidden", minHeight: 400,
        }}>
          <MindMap markdown={filteredMd} />
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
          {(selected ? classes.filter(c => c.id === selected) : classes).map(c => {
            const concepts = (c.data?.concepts || []).map(x => typeof x === "string" ? x : x.name).filter(Boolean);
            if (concepts.length === 0) return null;
            return (
              <div key={c.id} style={{
                background: "var(--card)", border: "1px solid var(--border)",
                borderRadius: "var(--radius-card)", padding: "20px 24px",
              }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 12 }}>
                  {c.title}
                  <span style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 400, marginLeft: 8 }}>
                    {concepts.length} conceptos
                  </span>
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                  {concepts.map((name, i) => (
                    <span key={i} style={{
                      fontSize: 12, fontWeight: 500, color: "var(--text-2)",
                      background: "rgba(124,108,248,0.08)", border: "1px solid rgba(124,108,248,0.2)",
                      borderRadius: 99, padding: "4px 12px",
                    }}>
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function buildMarkdown(classes) {
  const lines = ["# Mapa de Conocimiento"];
  for (const c of classes) {
    const concepts = (c.data?.concepts || []).map(x => typeof x === "string" ? x : x.name).filter(Boolean);
    if (concepts.length === 0) continue;
    lines.push(`## ${c.title}`);
    for (const name of concepts) lines.push(`### ${name}`);
  }
  return lines.join("\n");
}
