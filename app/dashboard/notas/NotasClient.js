"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

function Icon({ size = 16, children }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}
const IcoCheck     = ({ s }) => <Icon size={s}><polyline points="20 6 9 17 4 12"/></Icon>;
const IcoSave      = ({ s }) => <Icon size={s}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></Icon>;
const IcoFileText  = ({ s }) => <Icon size={s}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></Icon>;
const IcoEdit      = ({ s }) => <Icon size={s}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></Icon>;

function timeSince(dateStr) {
  const days = Math.floor((Date.now() - new Date(dateStr)) / 86400000);
  if (days === 0) return "hoy";
  if (days === 1) return "ayer";
  if (days < 7)  return `hace ${days} días`;
  return new Date(dateStr).toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

export default function NotasClient({ classes: initialClasses }) {
  const [classes]     = useState(initialClasses);
  const [selected, setSelected] = useState(initialClasses[0] ?? null);
  const [notes, setNotes]       = useState(selected?.data?.notes || "");
  const [saved,  setSaved]      = useState(true);
  const [saving, setSaving]     = useState(false);
  const [filter, setFilter]     = useState("");
  const timerRef = useRef(null);
  const supabase = useRef(createClient());

  const filtered = classes.filter(c =>
    c.title.toLowerCase().includes(filter.toLowerCase())
  );

  function selectClass(c) {
    if (selected?.id === c.id) return;
    setSelected(c);
    setNotes(c.data?.notes || "");
    setSaved(true);
  }

  const doSave = useCallback(async (classId, text) => {
    setSaving(true);
    const cls = classes.find(c => c.id === classId);
    if (!cls) { setSaving(false); return; }
    await supabase.current.from("classes").update({
      data: { ...cls.data, notes: text },
    }).eq("id", classId);
    setSaving(false);
    setSaved(true);
  }, [classes]);

  function onNotesChange(e) {
    setNotes(e.target.value);
    setSaved(false);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      doSave(selected.id, e.target.value);
    }, 1500);
  }

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const noteCount = classes.filter(c => c.data?.notes?.trim()).length;

  return (
    <div style={{ padding: "40px 48px", display: "flex", flexDirection: "column", gap: 28, maxWidth: 1100, height: "calc(100vh - 1px)", boxSizing: "border-box" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em" }}>
            Notas
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-2)", marginTop: 6 }}>
            {noteCount} de {classes.length} clases con notas · Guardado automático
          </p>
        </div>
      </div>

      {/* Main layout */}
      <div style={{ display: "flex", gap: 20, flex: 1, minHeight: 0 }}>

        {/* Left: class list */}
        <div style={{
          width: 260, flexShrink: 0,
          background: "var(--card)", border: "1px solid var(--border)",
          borderRadius: "var(--radius-card)", display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}>
          {/* Search */}
          <div style={{ padding: "12px 12px 8px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
            <input
              placeholder="Buscar clase…"
              value={filter}
              onChange={e => setFilter(e.target.value)}
              style={{
                width: "100%", background: "rgba(255,255,255,0.05)",
                border: "1px solid var(--border)", borderRadius: 10,
                padding: "8px 12px", fontSize: 13, color: "var(--text)",
                outline: "none", boxSizing: "border-box",
              }}
            />
          </div>

          {/* List */}
          <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
            {filtered.length === 0 && (
              <p style={{ fontSize: 12, color: "var(--text-3)", textAlign: "center", padding: "20px 12px" }}>
                Sin resultados
              </p>
            )}
            {filtered.map(c => {
              const isActive  = selected?.id === c.id;
              const hasNotes  = !!c.data?.notes?.trim();
              return (
                <button
                  key={c.id}
                  onClick={() => selectClass(c)}
                  style={{
                    width: "100%", textAlign: "left", border: "none", cursor: "pointer",
                    background: isActive ? "var(--accent-dim)" : "transparent",
                    borderRadius: 10, padding: "10px 12px", marginBottom: 2,
                    borderLeft: isActive ? "2px solid var(--accent)" : "2px solid transparent",
                    transition: "background 150ms",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <IcoFileText s={14} />
                    <span style={{
                      fontSize: 13, fontWeight: isActive ? 600 : 400,
                      color: isActive ? "var(--accent)" : "var(--text)",
                      flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {c.title}
                    </span>
                    {hasNotes && (
                      <span style={{
                        width: 6, height: 6, borderRadius: "50%",
                        background: isActive ? "var(--accent)" : "var(--green)",
                        flexShrink: 0,
                      }} />
                    )}
                  </div>
                  <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 3, paddingLeft: 22 }}>
                    {timeSince(c.created_at)}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: editor */}
        {selected ? (
          <div style={{
            flex: 1, display: "flex", flexDirection: "column",
            background: "var(--card)", border: "1px solid var(--border)",
            borderRadius: "var(--radius-card)", overflow: "hidden",
          }}>
            {/* Toolbar */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "14px 20px", borderBottom: "1px solid var(--border)", flexShrink: 0,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <IcoEdit s={15} />
                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
                  {selected.title}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {saving ? (
                  <span style={{ fontSize: 12, color: "var(--text-3)" }}>Guardando…</span>
                ) : saved ? (
                  <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--green)" }}>
                    <IcoCheck s={13} /> Guardado
                  </span>
                ) : (
                  <span style={{ fontSize: 12, color: "var(--yellow)" }}>Sin guardar</span>
                )}
                <button
                  onClick={() => doSave(selected.id, notes)}
                  disabled={saved || saving}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    background: "var(--accent)", color: "white", border: "none",
                    borderRadius: 9, padding: "7px 14px", fontSize: 12, fontWeight: 600,
                    cursor: saved || saving ? "not-allowed" : "pointer",
                    opacity: saved || saving ? 0.5 : 1,
                  }}
                >
                  <IcoSave s={12} /> Guardar
                </button>
              </div>
            </div>

            {/* Textarea */}
            <textarea
              value={notes}
              onChange={onNotesChange}
              placeholder={`Escribe tus notas sobre "${selected.title}" aquí…\n\nSoporta markdown: **negrita**, ## títulos, - listas`}
              style={{
                flex: 1, resize: "none", border: "none", outline: "none",
                background: "transparent", color: "var(--text)",
                fontSize: 14, lineHeight: 1.8, padding: "20px 24px",
                fontFamily: "inherit",
              }}
            />
          </div>
        ) : (
          <div style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
            background: "var(--card)", border: "1px solid var(--border)",
            borderRadius: "var(--radius-card)",
          }}>
            <p style={{ fontSize: 14, color: "var(--text-3)" }}>
              Selecciona una clase para escribir notas
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
