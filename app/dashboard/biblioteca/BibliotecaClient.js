"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

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

const PDF_COLORS = [
  { bg: "rgba(239,68,68,0.10)",   fg: "#EF4444" },
  { bg: "rgba(124,108,248,0.12)", fg: "#7C6CF8" },
  { bg: "rgba(34,197,94,0.10)",   fg: "#22C55E" },
  { bg: "rgba(251,191,36,0.10)",  fg: "#FBBF24" },
  { bg: "rgba(96,165,250,0.10)",  fg: "#60A5FA" },
];

/* ── Tree items ── */
function TreeRow({ active, depth = 0, children, onClick }) {
  return (
    <div
      onClick={onClick}
      className={active ? undefined : "nav-item"}
      style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: `7px 12px 7px ${14 + depth * 16}px`,
        borderRadius: 8, marginBottom: 1, cursor: "pointer",
        background: active ? "var(--accent-dim)" : "transparent",
        border: active ? "1px solid rgba(124,108,248,0.18)" : "1px solid transparent",
        color: active ? "var(--accent)" : "var(--text-2)",
        fontSize: 13, fontWeight: active ? 600 : 400,
        transition: "all 140ms",
      }}
    >
      {children}
    </div>
  );
}

/* ── Material card ── */
function MaterialCard({ c, colorIdx }) {
  const col     = PDF_COLORS[colorIdx % PDF_COLORS.length];
  const date    = new Date(c.created_at).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
  const summary = c.data?.material_summary || "";
  const preview = summary.length > 180 ? summary.slice(0, 180) + "…" : summary;
  const concepts = (c.data?.concepts || [])
    .map(x => typeof x === "string" ? x : x?.name)
    .filter(Boolean)
    .slice(0, 4);

  return (
    <Link href={`/class/${c.id}`} style={{ textDecoration: "none" }}>
      <div className="card-lift" style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-card)", padding: 20, display: "flex", flexDirection: "column", gap: 12, cursor: "pointer", height: "100%", boxSizing: "border-box" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: col.bg, color: col.fg, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <IcoFileText s={18} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontWeight: 600, fontSize: 13.5, color: "var(--text)", lineHeight: 1.35, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {c.title}
            </p>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ fontSize: 10, fontWeight: 700, background: col.bg, color: col.fg, borderRadius: 99, padding: "1px 7px", border: `1px solid ${col.fg}30` }}>PDF</span>
              <span style={{ fontSize: 11, color: "var(--text-3)" }}>{date}</span>
            </div>
          </div>
        </div>
        {preview && <p style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.6, flex: 1 }}>{preview}</p>}
        {concepts.length > 0 && (
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {concepts.map((tag, j) => (
              <span key={j} style={{ fontSize: 11, color: "var(--text-3)", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 99, padding: "1px 8px", maxWidth: 110, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {tag}
              </span>
            ))}
            {c.data?.concepts?.length > 4 && <span style={{ fontSize: 11, color: "var(--text-3)", alignSelf: "center" }}>+{c.data.concepts.length - 4}</span>}
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", paddingTop: 8, borderTop: "1px solid var(--border)" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 3, color: "var(--accent)", fontSize: 12, fontWeight: 600 }}>
            Ver clase <IcoChevRight s={11} />
          </span>
        </div>
      </div>
    </Link>
  );
}

/* ── Main component ── */
export default function BibliotecaClient({ classes }) {
  const [courses,         setCourses]         = useState([]);
  const [selection,       setSelection]       = useState({ type: "all" });
  const [expandedCourses, setExpandedCourses] = useState(new Set());

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("cursos_v1") || "[]");
      setCourses(stored);
      setExpandedCourses(new Set(stored.map(c => c.id)));
    } catch {}
  }, []);

  const withPDF = classes.filter(c => !!c.data?.material_summary);

  // Classes in at least one course
  const allCourseClassIds = new Set(courses.flatMap(c => c.classIds || []));
  const uncategorized     = withPDF.filter(c => !allCourseClassIds.has(c.id));

  // Compute displayed list
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
    setExpandedCourses(prev => {
      const next = new Set(prev);
      if (next.has(courseId)) next.delete(courseId); else next.add(courseId);
      return next;
    });
  }

  // Label for the right panel header
  function selectionLabel() {
    if (selection.type === "all") return "Todos los materiales";
    if (selection.type === "uncategorized") return "Sin curso";
    if (selection.type === "course") return courses.find(c => c.id === selection.courseId)?.title || "Curso";
    if (selection.type === "class") return classes.find(c => c.id === selection.classId)?.title || "Clase";
    return "";
  }

  return (
    <div style={{ display: "flex", height: "calc(100vh - 1px)", overflow: "hidden" }}>

      {/* ── LEFT TREE PANEL ── */}
      <div style={{ width: 240, flexShrink: 0, borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "20px 12px 12px", flexShrink: 0 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", letterSpacing: "0.07em", textTransform: "uppercase", padding: "0 4px" }}>Biblioteca</p>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "0 8px 16px" }}>

          {/* Todos */}
          <TreeRow active={selection.type === "all"} onClick={() => setSelection({ type: "all" })}>
            <span style={{ color: "inherit", opacity: 0.75 }}><IcoFolder s={14} /></span>
            <span style={{ flex: 1 }}>Todos</span>
            <span style={{ fontSize: 11, opacity: 0.6 }}>{withPDF.length}</span>
          </TreeRow>

          {/* Courses */}
          {courses.map(course => {
            const courseClasses = withPDF.filter(c => (course.classIds || []).includes(c.id));
            if (courseClasses.length === 0) return null;
            const expanded  = expandedCourses.has(course.id);
            const isActive  = selection.type === "course" && selection.courseId === course.id;

            return (
              <div key={course.id}>
                {/* Course row */}
                <div
                  className={isActive ? undefined : "nav-item"}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "7px 12px", borderRadius: 8, marginBottom: 1,
                    cursor: "pointer",
                    background: isActive ? "var(--accent-dim)" : "transparent",
                    border: isActive ? "1px solid rgba(124,108,248,0.18)" : "1px solid transparent",
                    color: isActive ? "var(--accent)" : "var(--text-2)",
                    fontSize: 13, fontWeight: isActive ? 600 : 500,
                    transition: "all 140ms",
                  }}
                >
                  {/* Expand toggle */}
                  <span
                    onClick={e => { e.stopPropagation(); toggleExpand(course.id); }}
                    style={{ color: "inherit", opacity: 0.55, flexShrink: 0, display: "flex" }}
                  >
                    {expanded ? <IcoChevDown s={13} /> : <IcoChevRight s={13} />}
                  </span>
                  {/* Color dot */}
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: course.color || "var(--accent)", flexShrink: 0 }} />
                  {/* Label */}
                  <span
                    style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                    onClick={() => setSelection({ type: "course", courseId: course.id })}
                  >
                    {course.title}
                  </span>
                  <span
                    style={{ fontSize: 11, opacity: 0.6, flexShrink: 0 }}
                    onClick={() => setSelection({ type: "course", courseId: course.id })}
                  >
                    {courseClasses.length}
                  </span>
                </div>

                {/* Classes inside course */}
                {expanded && courseClasses.map(cls => {
                  const clsActive = selection.type === "class" && selection.classId === cls.id;
                  return (
                    <TreeRow
                      key={`${course.id}-${cls.id}`}
                      active={clsActive}
                      depth={1}
                      onClick={() => setSelection({ type: "class", classId: cls.id })}
                    >
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: clsActive ? "var(--accent)" : "var(--text-3)", flexShrink: 0 }} />
                      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12 }}>
                        {cls.title}
                      </span>
                    </TreeRow>
                  );
                })}
              </div>
            );
          })}

          {/* Uncategorized */}
          {uncategorized.length > 0 && (
            <>
              <div style={{ height: 1, background: "var(--border)", margin: "8px 4px" }} />
              <TreeRow
                active={selection.type === "uncategorized"}
                onClick={() => setSelection({ type: "uncategorized" })}
              >
                <span style={{ color: "inherit", opacity: 0.65 }}><IcoInbox s={14} /></span>
                <span style={{ flex: 1 }}>Sin curso</span>
                <span style={{ fontSize: 11, opacity: 0.6 }}>{uncategorized.length}</span>
              </TreeRow>
            </>
          )}
        </div>

        {/* Add course shortcut */}
        <div style={{ padding: "10px 12px", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
          <Link href="/dashboard/cursos" style={{ textDecoration: "none" }}>
            <div className="nav-item" style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8, color: "var(--text-3)", fontSize: 12, cursor: "pointer" }}>
              <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
              Gestionar cursos
            </div>
          </Link>
        </div>
      </div>

      {/* ── RIGHT: GRID ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Sub-header */}
        <div style={{ padding: "20px 32px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.01em" }}>
              {selectionLabel()}
            </h2>
            <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 3 }}>
              {displayed.length} {displayed.length === 1 ? "material" : "materiales"}
              {displayed.reduce((s, c) => s + (c.data?.concepts?.length || 0), 0) > 0
                && ` · ${displayed.reduce((s, c) => s + (c.data?.concepts?.length || 0), 0)} conceptos`}
            </p>
          </div>
          <Link href="/class/new" style={{ textDecoration: "none" }}>
            <button className="btn-accent" style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--accent)", color: "white", border: "none", borderRadius: "var(--radius-btn)", padding: "9px 18px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
              <IcoPlay s={13} /> Nueva clase
            </button>
          </Link>
        </div>

        {/* Grid content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>
          {displayed.length === 0 ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 40, marginBottom: 14 }}>📄</div>
                <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>
                  {selection.type === "uncategorized"
                    ? "Todos los materiales están en un curso"
                    : "Sin materiales aquí"}
                </p>
                <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.65, maxWidth: 300 }}>
                  {selection.type === "all"
                    ? "Sube un PDF durante una clase activa y aparecerá aquí."
                    : "Las clases de esta selección no tienen PDFs subidos."}
                </p>
                {selection.type === "all" && (
                  <Link href="/class/new" style={{ textDecoration: "none" }}>
                    <button className="btn-accent" style={{ marginTop: 20, background: "var(--accent)", color: "white", border: "none", borderRadius: "var(--radius-btn)", padding: "10px 22px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                      Iniciar clase
                    </button>
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14, alignItems: "start" }}>
              {displayed.map((c, i) => <MaterialCard key={c.id} c={c} colorIdx={i} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
