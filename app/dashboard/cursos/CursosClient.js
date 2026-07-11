"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";

const COLORS = ["#7C6CF8", "#22C55E", "#60A5FA", "#FBBF24", "#EF4444", "#A78BFA"];
const SK = "cursos_v1";

function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }
function load() { try { return JSON.parse(localStorage.getItem(SK) || "[]"); } catch { return []; } }
function persist(v) { localStorage.setItem(SK, JSON.stringify(v)); }

function fmtDate(str) {
  return new Date(str).toLocaleDateString("es-MX", { day: "numeric", month: "short", timeZone: "UTC" });
}

export default function CursosClient({ classes }) {
  const [courses,  setCourses]  = useState([]);
  const [selId,    setSelId]    = useState(null);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [search,   setSearch]   = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    const c = load();
    setCourses(c);
    if (c.length) setSelId(c[0].id);
  }, []);

  useEffect(() => {
    if (creating) inputRef.current?.focus();
  }, [creating]);

  function save(list) { setCourses(list); persist(list); }

  function createCourse() {
    const t = newTitle.trim();
    if (!t) return;
    const c = { id: uid(), title: t, color: COLORS[courses.length % COLORS.length], classIds: [], description: "", created_at: new Date().toISOString() };
    const updated = [c, ...courses];
    save(updated); setSelId(c.id); setCreating(false); setNewTitle("");
  }

  function patch(id, delta) {
    save(courses.map(c => c.id === id ? { ...c, ...delta } : c));
  }

  function deleteCourse(id) {
    const updated = courses.filter(c => c.id !== id);
    save(updated); setSelId(updated[0]?.id ?? null);
  }

  function toggleClass(classId) {
    const cur = courses.find(c => c.id === selId);
    if (!cur) return;
    const ids = cur.classIds.includes(classId)
      ? cur.classIds.filter(i => i !== classId)
      : [...cur.classIds, classId];
    patch(selId, { classIds: ids });
  }

  const cur = courses.find(c => c.id === selId);
  const curClasses     = cur ? classes.filter(c => cur.classIds.includes(c.id)) : [];
  const totalConcepts  = curClasses.reduce((s, c) => s + (c.data?.concepts?.length || 0), 0);
  const filteredCls    = classes.filter(c => c.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ display: "flex", gap: 20, flex: 1, minHeight: 0 }}>

      {/* ── Left: course list ──────────────────────────────────────────── */}
      <div style={{ width: 256, flexShrink: 0, background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-card)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Mis cursos</span>
          <button onClick={() => setCreating(true)} style={{ background: "var(--accent)", color: "white", border: "none", borderRadius: 7, width: 26, height: 26, cursor: "pointer", fontSize: 20, lineHeight: "0", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
        </div>

        {creating && (
          <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
            <input
              ref={inputRef}
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") createCourse(); if (e.key === "Escape") { setCreating(false); setNewTitle(""); } }}
              placeholder="Nombre del curso…"
              style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid var(--accent)", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "var(--text)", outline: "none", boxSizing: "border-box", marginBottom: 8 }}
            />
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={createCourse} style={{ flex: 1, background: "var(--accent)", color: "white", border: "none", borderRadius: 7, padding: "7px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Crear</button>
              <button onClick={() => { setCreating(false); setNewTitle(""); }} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", borderRadius: 7, padding: "7px 10px", fontSize: 12, color: "var(--text-2)", cursor: "pointer" }}>✕</button>
            </div>
          </div>
        )}

        <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
          {courses.length === 0 && !creating && (
            <div style={{ padding: "28px 16px", textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📂</div>
              <p style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 12 }}>Sin cursos todavía</p>
              <button onClick={() => setCreating(true)} style={{ background: "var(--accent-dim)", color: "var(--accent)", border: "1px solid rgba(124,108,248,0.2)", borderRadius: 9, padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                Crear curso
              </button>
            </div>
          )}
          {courses.map(c => (
            <button key={c.id} onClick={() => setSelId(c.id)} style={{
              width: "100%", textAlign: "left",
              background: selId === c.id ? "var(--accent-dim)" : "transparent",
              border: `1px solid ${selId === c.id ? "rgba(124,108,248,0.25)" : "transparent"}`,
              borderRadius: 10, padding: "10px 12px", marginBottom: 2, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: c.color, flexShrink: 0, boxShadow: selId === c.id ? `0 0 8px ${c.color}80` : "none" }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: selId === c.id ? 600 : 400, color: selId === c.id ? "var(--accent)" : "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title}</p>
                <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 1 }}>{c.classIds.length} clases</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Right: editor ──────────────────────────────────────────────── */}
      {cur ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>

          {/* Course header */}
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-card)", padding: "22px 26px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
              {/* Color dots */}
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                {COLORS.map(col => (
                  <button key={col} onClick={() => patch(cur.id, { color: col })} style={{ width: 18, height: 18, borderRadius: "50%", background: col, border: `2.5px solid ${cur.color === col ? "white" : "transparent"}`, cursor: "pointer", outline: "none", transition: "border-color 120ms" }} />
                ))}
              </div>
              {/* Title input */}
              <input
                value={cur.title}
                onChange={e => patch(cur.id, { title: e.target.value })}
                style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 18, fontWeight: 700, color: "var(--text)" }}
              />
              <button onClick={() => deleteCourse(cur.id)} style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "6px 14px", fontSize: 12, color: "#EF4444", cursor: "pointer", flexShrink: 0 }}>
                Eliminar
              </button>
            </div>
            <textarea
              value={cur.description}
              onChange={e => patch(cur.id, { description: e.target.value })}
              placeholder="Descripción del curso (opcional)…"
              rows={2}
              style={{ width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "var(--text-2)", resize: "none", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
            />

            {/* Stats + quick links */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
              <div style={{ display: "flex", gap: 24 }}>
                {[{ l: "Clases", v: curClasses.length }, { l: "Conceptos", v: totalConcepts }].map(({ l, v }) => (
                  <div key={l}>
                    <span style={{ fontSize: 22, fontWeight: 700, color: cur.color }}>{v}</span>
                    <span style={{ fontSize: 12, color: "var(--text-3)", marginLeft: 6 }}>{l}</span>
                  </div>
                ))}
              </div>
              {curClasses.length > 0 && (
                <div style={{ display: "flex", gap: 8 }}>
                  <Link href="/dashboard/repaso" style={{ textDecoration: "none" }}>
                    <button style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", borderRadius: 9, padding: "7px 14px", fontSize: 12, color: "var(--text-2)", cursor: "pointer" }}>
                      Repasar →
                    </button>
                  </Link>
                  <Link href="/dashboard/evaluaciones" style={{ textDecoration: "none" }}>
                    <button style={{ background: "var(--accent-dim)", border: "1px solid rgba(124,108,248,0.2)", borderRadius: 9, padding: "7px 14px", fontSize: 12, color: "var(--accent)", fontWeight: 600, cursor: "pointer" }}>
                      Evaluar →
                    </button>
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Class selector */}
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-card)", flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "12px 16px 8px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>Clases del curso</p>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar clases…"
                style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: 9, padding: "7px 12px", fontSize: 12, color: "var(--text)", outline: "none", boxSizing: "border-box" }}
              />
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px" }}>
              {classes.length === 0 && (
                <p style={{ fontSize: 13, color: "var(--text-3)", textAlign: "center", paddingTop: 24 }}>No hay clases disponibles</p>
              )}
              {filteredCls.map(c => {
                const on = cur.classIds.includes(c.id);
                return (
                  <div key={c.id} onClick={() => toggleClass(c.id)} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 12px", borderRadius: 10, marginBottom: 4, cursor: "pointer",
                    background: on ? `${cur.color}10` : "transparent",
                    border: `1px solid ${on ? cur.color + "30" : "transparent"}`,
                    transition: "all 130ms",
                  }}>
                    <div style={{ width: 16, height: 16, borderRadius: 4, flexShrink: 0, border: `1.5px solid ${on ? cur.color : "var(--border)"}`, background: on ? cur.color : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 130ms" }}>
                      {on && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: on ? 600 : 400, color: on ? "var(--text)" : "var(--text-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title}</p>
                      <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 1 }}>
                        {fmtDate(c.created_at)} · {c.data?.concepts?.length || 0} conceptos
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-card)" }}>
          <div style={{ textAlign: "center", maxWidth: 300 }}>
            <div style={{ fontSize: 44, marginBottom: 16 }}>📂</div>
            <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>Organiza tus clases en cursos</p>
            <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.6 }}>
              Crea cursos para agrupar clases relacionadas, llevar un progreso y navegar más fácil.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
