"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

function Icon({ size = 14, children }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}
const IcoChevRight = () => <Icon><polyline points="9 18 15 12 9 6"/></Icon>;

export default function CoursesWidget({ classes = [] }) {
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    try { setCourses(JSON.parse(localStorage.getItem("cursos_v1") || "[]")); } catch {}
  }, []);

  if (courses.length === 0) return null;

  const classById = Object.fromEntries(classes.map(c => [c.id, c]));

  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-card)", padding: "20px 20px 8px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>Mis cursos</h3>
        <Link href="/dashboard/cursos" style={{ textDecoration: "none" }}>
          <span style={{ fontSize: 12, color: "var(--accent)", cursor: "pointer", fontWeight: 500 }}>Gestionar</span>
        </Link>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        {courses.slice(0, 4).map(course => {
          const count = (course.classIds || []).filter(id => classById[id]).length;
          const concepts = (course.classIds || [])
            .filter(id => classById[id])
            .reduce((s, id) => s + (classById[id]?.data?.concepts?.length || 0), 0);
          return (
            <Link key={course.id} href="/dashboard/cursos" style={{ textDecoration: "none" }}>
              <div className="row-hover" style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 8px", marginBottom: 2 }}>
                <div style={{
                  width: 10, height: 10, borderRadius: "50%",
                  background: course.color || "var(--accent)", flexShrink: 0,
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {course.title}
                  </p>
                  <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>
                    {count} clase{count !== 1 ? "s" : ""}
                    {concepts > 0 && ` · ${concepts} conceptos`}
                  </p>
                </div>
                <span style={{ color: "var(--text-3)", flexShrink: 0 }}><IcoChevRight /></span>
              </div>
            </Link>
          );
        })}
        {courses.length > 4 && (
          <div style={{ padding: "6px 8px 12px", fontSize: 12, color: "var(--text-3)" }}>
            +{courses.length - 4} curso{courses.length - 4 > 1 ? "s" : ""} más
          </div>
        )}
      </div>
    </div>
  );
}
