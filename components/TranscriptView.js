"use client";
import { useMemo, useState } from "react";
import Icon from "./Icon";

const WORDS_PER_MIN = 130;

function fmt(sec) {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  const mm = String(m).padStart(2, "0"), ss = String(r).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

function hmsToSec(t) {
  const [h, m, s] = (t || "").split(":").map(Number);
  return [h, m, s].some(Number.isNaN) ? null : h * 3600 + m * 60 + s;
}

// Bloques del transcript con marca de tiempo relativa al inicio de la clase.
// - Clases nuevas: `segments` guardados con la hora de cada fragmento.
// - Clases anteriores: se agrupa en párrafos y se estima la hora por la velocidad del habla.
function buildBlocks(transcript, segments) {
  if (Array.isArray(segments) && segments.length) {
    const t0 = hmsToSec(segments[0].time);
    // Une fragmentos consecutivos de ~30 s en un bloque para que se lea mejor
    const blocks = [];
    for (const seg of segments) {
      const t = hmsToSec(seg.time);
      const rel = t0 !== null && t !== null ? (t - t0 + 86400) % 86400 : null;
      const last = blocks[blocks.length - 1];
      if (last && rel !== null && last.start !== null && rel - last.start < 30) last.text += " " + seg.text;
      else blocks.push({ start: rel, text: seg.text });
    }
    return blocks;
  }
  if (!transcript) return [];
  const sentences = transcript.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [transcript];
  const blocks = [];
  let words = 0;
  for (let i = 0; i < sentences.length; i += 4) {
    const text = sentences.slice(i, i + 4).join(" ").trim();
    blocks.push({ start: (words / WORDS_PER_MIN) * 60, text });
    words += text.split(/\s+/).length;
  }
  return blocks;
}

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

function Highlighted({ text, query, concepts }) {
  const terms = [query.trim(), ...concepts].filter((t) => t && t.length > 1);
  if (!terms.length) return text;
  const re = new RegExp(`(${terms.map(escapeRe).join("|")})`, "gi");
  const q = query.trim().toLowerCase();
  return text.split(re).map((part, i) => {
    const low = part.toLowerCase();
    if (q && low === q) return <mark key={i} className="tx-mark">{part}</mark>;
    if (concepts.some((c) => c.toLowerCase() === low)) return <strong key={i} className="tx-concept">{part}</strong>;
    return <span key={i}>{part}</span>;
  });
}

export default function TranscriptView({ transcript, segments, concepts = [] }) {
  const [query, setQuery] = useState("");
  const blocks = useMemo(() => buildBlocks(transcript, segments), [transcript, segments]);
  const q = query.trim().toLowerCase();
  const visible = q ? blocks.filter((b) => b.text.toLowerCase().includes(q)) : blocks;
  const matches = q ? blocks.reduce((n, b) => n + (b.text.toLowerCase().split(q).length - 1), 0) : 0;
  const isEstimated = !(Array.isArray(segments) && segments.length);

  if (!blocks.length) {
    return <p style={{ fontSize: 13, color: "var(--text-3)", textAlign: "center", marginTop: 40 }}>Esta clase no tiene transcript guardado.</p>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <label className="tx-search">
        <Icon name="search" size={16} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar en la transcripción…"
          aria-label="Buscar en la transcripción"
        />
        {q && <span className="tx-search__count">{matches} {matches === 1 ? "resultado" : "resultados"}</span>}
      </label>

      {isEstimated && (
        <p style={{ fontSize: 11.5, color: "var(--text-3)", display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="info" size={13} /> Tiempos aproximados según la velocidad del habla.
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {visible.map((b, i) => (
          <div key={i} className="tx-block">
            <span className="tx-time">{b.start !== null ? fmt(b.start) : "—"}</span>
            <p className="tx-text"><Highlighted text={b.text} query={query} concepts={concepts} /></p>
          </div>
        ))}
        {q && visible.length === 0 && (
          <p style={{ fontSize: 13, color: "var(--text-3)", textAlign: "center", padding: 20 }}>No hay coincidencias para “{query}”.</p>
        )}
      </div>
    </div>
  );
}
