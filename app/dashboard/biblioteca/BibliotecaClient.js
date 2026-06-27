"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

/* ── Icons ── */
function Icon({ size = 16, children }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">{children}</svg>;
}
const IcoFileText  = ({ s = 16 }) => <Icon size={s}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></Icon>;
const IcoChevRight = ({ s = 14 }) => <Icon size={s}><polyline points="9 18 15 12 9 6"/></Icon>;
const IcoChevDown  = ({ s = 14 }) => <Icon size={s}><polyline points="6 9 12 15 18 9"/></Icon>;
const IcoPlay      = ({ s = 14 }) => <Icon size={s}><polygon points="5 3 19 12 5 21 5 3"/></Icon>;
const IcoFolder    = ({ s = 15 }) => <Icon size={s}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></Icon>;
const IcoInbox     = ({ s = 15 }) => <Icon size={s}><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></Icon>;
const IcoUpload    = ({ s = 15 }) => <Icon size={s}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></Icon>;
const IcoX         = ({ s = 16 }) => <Icon size={s}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></Icon>;
const IcoCheck     = ({ s = 16 }) => <Icon size={s}><polyline points="20 6 9 17 4 12"/></Icon>;

const PDF_COLORS = [
  { bg: "rgba(239,68,68,0.10)",   fg: "#EF4444" },
  { bg: "rgba(124,108,248,0.12)", fg: "#7C6CF8" },
  { bg: "rgba(34,197,94,0.10)",   fg: "#22C55E" },
  { bg: "rgba(251,191,36,0.10)",  fg: "#FBBF24" },
  { bg: "rgba(96,165,250,0.10)",  fg: "#60A5FA" },
];

/* ── Tree row ── */
function TreeRow({ active, depth = 0, onClick, children }) {
  return (
    <div onClick={onClick} className={active ? undefined : "nav-item"} style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: `7px 12px 7px ${14 + depth * 16}px`,
      borderRadius: 8, marginBottom: 1, cursor: "pointer",
      background: active ? "var(--accent-dim)" : "transparent",
      border: active ? "1px solid rgba(124,108,248,0.18)" : "1px solid transparent",
      color: active ? "var(--accent)" : "var(--text-2)",
      fontSize: 13, fontWeight: active ? 600 : 400, transition: "all 140ms",
    }}>
      {children}
    </div>
  );
}

/* ── Material card ── */
function MaterialCard({ c, colorIdx, onUpload }) {
  const col     = PDF_COLORS[colorIdx % PDF_COLORS.length];
  const date    = new Date(c.created_at).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
  const summary = c.data?.material_summary || "";
  const preview = summary.length > 180 ? summary.slice(0, 180) + "…" : summary;
  const concepts = (c.data?.concepts || []).map(x => typeof x === "string" ? x : x?.name).filter(Boolean).slice(0, 4);

  return (
    <div style={{ position: "relative" }}>
      <Link href={`/class/${c.id}`} style={{ textDecoration: "none" }}>
        <div className="card-lift" style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-card)", padding: 20, display: "flex", flexDirection: "column", gap: 12, cursor: "pointer" }}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: col.bg, color: col.fg, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <IcoFileText s={18} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 600, fontSize: 13.5, color: "var(--text)", lineHeight: 1.35, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title}</p>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ fontSize: 10, fontWeight: 700, background: col.bg, color: col.fg, borderRadius: 99, padding: "1px 7px", border: `1px solid ${col.fg}30` }}>PDF</span>
                <span style={{ fontSize: 11, color: "var(--text-3)" }}>{date}</span>
              </div>
            </div>
            {/* Replace PDF button */}
            <button
              onClick={e => { e.preventDefault(); e.stopPropagation(); onUpload(c.id); }}
              title="Reemplazar PDF"
              style={{ padding: "4px 8px", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", borderRadius: 7, color: "var(--text-3)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 11, flexShrink: 0 }}
            >
              <IcoUpload s={12} /> Reemplazar
            </button>
          </div>
          {preview && <p style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.6 }}>{preview}</p>}
          {concepts.length > 0 && (
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {concepts.map((tag, j) => (
                <span key={j} style={{ fontSize: 11, color: "var(--text-3)", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 99, padding: "1px 8px", maxWidth: 110, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tag}</span>
              ))}
              {c.data?.concepts?.length > 4 && <span style={{ fontSize: 11, color: "var(--text-3)", alignSelf: "center" }}>+{c.data.concepts.length - 4}</span>}
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", paddingTop: 8, borderTop: "1px solid var(--border)" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 3, color: "var(--accent)", fontSize: 12, fontWeight: 600 }}>Ver clase <IcoChevRight s={11} /></span>
          </div>
        </div>
      </Link>
    </div>
  );
}

/* ── Upload modal ── */
function UploadModal({ classes, courses, initialClassId, onClose, onSuccess }) {
  const [classId,   setClassId]   = useState(initialClassId || "");
  const [file,      setFile]      = useState(null);
  const [dragging,  setDragging]  = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error,     setError]     = useState("");
  const [done,      setDone]      = useState(false);
  const fileRef = useRef(null);

  const selectedClass = classes.find(c => c.id === classId);
  const hasExisting   = !!selectedClass?.data?.material_summary;

  function handleDrop(e) {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f?.type === "application/pdf") setFile(f);
    else setError("Solo se aceptan archivos PDF.");
  }

  async function upload() {
    if (!classId || !file) return;
    setError(""); setUploading(true);
    try {
      // 1. Get summary from /api/upload-material
      const form = new FormData();
      form.append("pdf", file);
      const res  = await fetch("/api/upload-material", { method: "POST", body: form });
      const data = await res.json();
      if (data.skip) { setError("No se pudo procesar el PDF. Intenta con otro archivo."); setUploading(false); return; }
      if (data.error) { setError(data.error); setUploading(false); return; }

      // 2. Update class in Supabase
      const supabase = createClient();
      const { data: current } = await supabase.from("classes").select("data").eq("id", classId).single();
      const { error: updateErr } = await supabase.from("classes").update({
        data: { ...(current?.data || {}), material_summary: data.summary },
      }).eq("id", classId);

      if (updateErr) { setError("Error al guardar: " + updateErr.message); setUploading(false); return; }
      setDone(true);
      setTimeout(() => { onSuccess(); onClose(); }, 1400);
    } catch (e) {
      setError("Error inesperado: " + e.message);
      setUploading(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }} />

      {/* Panel */}
      <div style={{ position: "relative", width: "100%", maxWidth: 480, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, padding: 28, boxShadow: "0 24px 64px rgba(0,0,0,0.4)", display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>Subir material PDF</h2>
            <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 3 }}>El PDF se procesará con IA y quedará vinculado a la clase</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-3)", cursor: "pointer", padding: 4 }}><IcoX s={18} /></button>
        </div>

        {/* Class selector */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", display: "block", marginBottom: 6 }}>
            Clase de destino
          </label>
          <select
            value={classId}
            onChange={e => setClassId(e.target.value)}
            style={{ width: "100%", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "9px 12px", fontSize: 13, color: "var(--text)", outline: "none", cursor: "pointer" }}
          >
            <option value="">— Elige una clase —</option>
            {/* Group by course */}
            {courses.map(course => {
              const courseClasses = classes.filter(c => (course.classIds || []).includes(c.id));
              if (!courseClasses.length) return null;
              return (
                <optgroup key={course.id} label={course.title}>
                  {courseClasses.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.title}{c.data?.material_summary ? " (ya tiene PDF)" : ""}
                    </option>
                  ))}
                </optgroup>
              );
            })}
            {/* Uncategorized */}
            {(() => {
              const courseClassIds = new Set(courses.flatMap(c => c.classIds || []));
              const uncat = classes.filter(c => !courseClassIds.has(c.id));
              if (!uncat.length) return null;
              return (
                <optgroup label="Sin curso">
                  {uncat.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.title}{c.data?.material_summary ? " (ya tiene PDF)" : ""}
                    </option>
                  ))}
                </optgroup>
              );
            })()}
          </select>
          {hasExisting && (
            <p style={{ fontSize: 11, color: "#FBBF24", marginTop: 5, display: "flex", alignItems: "center", gap: 4 }}>
              ⚠ Esta clase ya tiene un PDF. El nuevo lo reemplazará.
            </p>
          )}
        </div>

        {/* File drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          style={{
            border: `2px dashed ${dragging ? "var(--accent)" : file ? "rgba(34,197,94,0.6)" : "var(--border)"}`,
            borderRadius: 12, padding: "28px 20px", textAlign: "center",
            background: dragging ? "rgba(124,108,248,0.06)" : file ? "rgba(34,197,94,0.05)" : "rgba(255,255,255,0.02)",
            cursor: "pointer", transition: "all 180ms",
          }}
        >
          <input ref={fileRef} type="file" accept=".pdf" style={{ display: "none" }}
            onChange={e => { const f = e.target.files?.[0]; if (f) setFile(f); }} />
          {file ? (
            <div>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#22C55E" }}>{file.name}</p>
              <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>
                {(file.size / 1024).toFixed(0)} KB · clic para cambiar
              </p>
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: 10, color: "var(--text-3)" }}><IcoUpload s={28} /></div>
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-2)" }}>Arrastra tu PDF aquí</p>
              <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>o haz clic para seleccionarlo</p>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <p style={{ fontSize: 12, color: "#EF4444", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "8px 12px" }}>
            {error}
          </p>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "10px 18px", background: "transparent", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text-2)", fontSize: 13, cursor: "pointer" }}>
            Cancelar
          </button>
          <button
            onClick={upload}
            disabled={!classId || !file || uploading || done}
            style={{
              padding: "10px 22px", background: done ? "#22C55E" : "var(--accent)", border: "none",
              borderRadius: 10, color: "white", fontSize: 13, fontWeight: 600,
              cursor: !classId || !file || uploading || done ? "not-allowed" : "pointer",
              opacity: !classId || !file ? 0.5 : 1,
              display: "flex", alignItems: "center", gap: 8, transition: "background 200ms",
            }}
          >
            {done ? <><IcoCheck s={14} /> ¡Guardado!</>
              : uploading ? "Procesando…"
              : <><IcoUpload s={14} /> Subir PDF</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main component ── */
export default function BibliotecaClient({ classes }) {
  const router = useRouter();
  const [courses,         setCourses]         = useState([]);
  const [selection,       setSelection]       = useState({ type: "all" });
  const [expandedCourses, setExpandedCourses] = useState(new Set());
  const [uploadModal,     setUploadModal]     = useState(null); // null | { initialClassId }

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("cursos_v1") || "[]");
      setCourses(stored);
      setExpandedCourses(new Set(stored.map(c => c.id)));
    } catch {}
  }, []);

  const withPDF           = classes.filter(c => !!c.data?.material_summary);
  const allCourseClassIds = new Set(courses.flatMap(c => c.classIds || []));
  const uncategorized     = withPDF.filter(c => !allCourseClassIds.has(c.id));

  let displayed = withPDF;
  if (selection.type === "course") {
    const course = courses.find(c => c.id === selection.courseId);
    displayed = withPDF.filter(c => (course?.classIds || []).includes(c.id));
  } else if (selection.type === "class") {
    displayed = withPDF.filter(c => c.id === selection.classId);
  } else if (selection.type === "uncategorized") {
    displayed = uncategorized;
  }

  function toggleExpand(courseId) {
    setExpandedCourses(prev => { const n = new Set(prev); n.has(courseId) ? n.delete(courseId) : n.add(courseId); return n; });
  }

  function openUpload(initialClassId) {
    setUploadModal({ initialClassId: initialClassId || "" });
  }

  // Determine pre-selected class for upload based on current selection
  function openUploadContextual() {
    if (selection.type === "class")  return openUpload(selection.classId);
    if (selection.type === "course") {
      const course = courses.find(c => c.id === selection.courseId);
      const first  = classes.find(c => (course?.classIds || []).includes(c.id));
      return openUpload(first?.id || "");
    }
    openUpload("");
  }

  function selectionLabel() {
    if (selection.type === "all")          return "Todos los materiales";
    if (selection.type === "uncategorized") return "Sin curso";
    if (selection.type === "course")       return courses.find(c => c.id === selection.courseId)?.title || "Curso";
    if (selection.type === "class")        return classes.find(c => c.id === selection.classId)?.title || "Clase";
    return "";
  }

  return (
    <>
      {uploadModal && (
        <UploadModal
          classes={classes}
          courses={courses}
          initialClassId={uploadModal.initialClassId}
          onClose={() => setUploadModal(null)}
          onSuccess={() => router.refresh()}
        />
      )}

      <div style={{ display: "flex", height: "calc(100vh - 1px)", overflow: "hidden" }}>

        {/* ── LEFT TREE PANEL ── */}
        <div style={{ width: 240, flexShrink: 0, borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "20px 12px 10px", flexShrink: 0 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", letterSpacing: "0.07em", textTransform: "uppercase", padding: "0 4px" }}>Biblioteca</p>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "0 8px" }}>
            {/* Todos */}
            <TreeRow active={selection.type === "all"} onClick={() => setSelection({ type: "all" })}>
              <span style={{ color: "inherit", opacity: 0.75 }}><IcoFolder s={14} /></span>
              <span style={{ flex: 1 }}>Todos</span>
              <span style={{ fontSize: 11, opacity: 0.6 }}>{withPDF.length}</span>
            </TreeRow>

            {/* Courses */}
            {courses.map(course => {
              const courseClasses = withPDF.filter(c => (course.classIds || []).includes(c.id));
              // Also show courses that have classes even without PDF (for uploading)
              const allCourseClasses = classes.filter(c => (course.classIds || []).includes(c.id));
              if (!allCourseClasses.length) return null;
              const expanded = expandedCourses.has(course.id);
              const isActive = selection.type === "course" && selection.courseId === course.id;

              return (
                <div key={course.id}>
                  <div
                    className={isActive ? undefined : "nav-item"}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "7px 12px", borderRadius: 8, marginBottom: 1,
                      cursor: "pointer",
                      background: isActive ? "var(--accent-dim)" : "transparent",
                      border: isActive ? "1px solid rgba(124,108,248,0.18)" : "1px solid transparent",
                      color: isActive ? "var(--accent)" : "var(--text-2)",
                      fontSize: 13, fontWeight: isActive ? 600 : 500, transition: "all 140ms",
                    }}
                  >
                    <span onClick={e => { e.stopPropagation(); toggleExpand(course.id); }} style={{ color: "inherit", opacity: 0.55, flexShrink: 0, display: "flex" }}>
                      {expanded ? <IcoChevDown s={13} /> : <IcoChevRight s={13} />}
                    </span>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: course.color || "var(--accent)", flexShrink: 0 }} />
                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                      onClick={() => setSelection({ type: "course", courseId: course.id })}>
                      {course.title}
                    </span>
                    <span style={{ fontSize: 11, opacity: 0.6, flexShrink: 0 }}
                      onClick={() => setSelection({ type: "course", courseId: course.id })}>
                      {courseClasses.length}/{allCourseClasses.length}
                    </span>
                    {/* Upload to course */}
                    <span
                      onClick={e => { e.stopPropagation(); const first = classes.find(c => (course.classIds || []).includes(c.id)); openUpload(first?.id || ""); }}
                      title="Subir PDF a este curso"
                      style={{ flexShrink: 0, display: "flex", opacity: 0.5, padding: "2px" }}
                    >
                      <IcoUpload s={12} />
                    </span>
                  </div>

                  {expanded && allCourseClasses.map(cls => {
                    const clsActive = selection.type === "class" && selection.classId === cls.id;
                    const hasPDF    = !!cls.data?.material_summary;
                    return (
                      <div key={`${course.id}-${cls.id}`} style={{ display: "flex", alignItems: "center", gap: 0 }}>
                        <div style={{ flex: 1 }}>
                          <TreeRow active={clsActive} depth={1} onClick={() => { if (hasPDF) setSelection({ type: "class", classId: cls.id }); }}>
                            <span style={{ width: 5, height: 5, borderRadius: "50%", background: hasPDF ? (clsActive ? "var(--accent)" : "#22C55E") : "var(--border)", flexShrink: 0 }} />
                            <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12, opacity: hasPDF ? 1 : 0.55 }}>
                              {cls.title}
                            </span>
                            {/* Upload / replace button per class */}
                            <span
                              onClick={e => { e.stopPropagation(); openUpload(cls.id); }}
                              title={hasPDF ? "Reemplazar PDF" : "Subir PDF"}
                              style={{ flexShrink: 0, display: "flex", opacity: 0.45, padding: "2px" }}
                            >
                              <IcoUpload s={11} />
                            </span>
                          </TreeRow>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {/* Uncategorized */}
            {uncategorized.length > 0 && (
              <>
                <div style={{ height: 1, background: "var(--border)", margin: "8px 4px" }} />
                <TreeRow active={selection.type === "uncategorized"} onClick={() => setSelection({ type: "uncategorized" })}>
                  <span style={{ color: "inherit", opacity: 0.65 }}><IcoInbox s={14} /></span>
                  <span style={{ flex: 1 }}>Sin curso</span>
                  <span style={{ fontSize: 11, opacity: 0.6 }}>{uncategorized.length}</span>
                </TreeRow>
              </>
            )}
          </div>

          {/* Footer */}
          <div style={{ padding: "10px 12px 12px", borderTop: "1px solid var(--border)", flexShrink: 0, display: "flex", flexDirection: "column", gap: 4 }}>
            <button
              onClick={openUploadContextual}
              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, background: "var(--accent)", color: "white", border: "none", borderRadius: 9, padding: "9px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
            >
              <IcoUpload s={13} /> Subir material
            </button>
            <Link href="/dashboard/cursos" style={{ textDecoration: "none" }}>
              <div className="nav-item" style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 8, color: "var(--text-3)", fontSize: 12, cursor: "pointer" }}>
                <span style={{ fontSize: 15, lineHeight: 1 }}>+</span> Gestionar cursos
              </div>
            </Link>
          </div>
        </div>

        {/* ── RIGHT GRID ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Sub-header */}
          <div style={{ padding: "20px 32px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.01em" }}>{selectionLabel()}</h2>
              <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 3 }}>
                {displayed.length} {displayed.length === 1 ? "material" : "materiales"}
                {displayed.reduce((s, c) => s + (c.data?.concepts?.length || 0), 0) > 0 && ` · ${displayed.reduce((s, c) => s + (c.data?.concepts?.length || 0), 0)} conceptos`}
              </p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={openUploadContextual}
                style={{ display: "flex", alignItems: "center", gap: 7, background: "rgba(124,108,248,0.12)", color: "var(--accent)", border: "1px solid rgba(124,108,248,0.25)", borderRadius: "var(--radius-btn)", padding: "9px 16px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
              >
                <IcoUpload s={13} /> Subir PDF
              </button>
              <Link href="/class/new" style={{ textDecoration: "none" }}>
                <button className="btn-accent" style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--accent)", color: "white", border: "none", borderRadius: "var(--radius-btn)", padding: "9px 18px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                  <IcoPlay s={13} /> Nueva clase
                </button>
              </Link>
            </div>
          </div>

          {/* Grid */}
          <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>
            {displayed.length === 0 ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 40, marginBottom: 14 }}>📄</div>
                  <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>
                    {selection.type === "uncategorized" ? "Todos los materiales están en un curso" : "Sin materiales aquí"}
                  </p>
                  <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.65, maxWidth: 300, marginBottom: 20 }}>
                    {selection.type === "all"
                      ? "Sube un PDF a una clase existente o inicia una clase nueva."
                      : "Las clases de esta selección no tienen PDFs subidos aún."}
                  </p>
                  <button
                    onClick={openUploadContextual}
                    style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "var(--accent)", color: "white", border: "none", borderRadius: "var(--radius-btn)", padding: "10px 20px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
                  >
                    <IcoUpload s={14} /> Subir material
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14, alignItems: "start" }}>
                {displayed.map((c, i) => (
                  <MaterialCard key={c.id} c={c} colorIdx={i} onUpload={openUpload} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
