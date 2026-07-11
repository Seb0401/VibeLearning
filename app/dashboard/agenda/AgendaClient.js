"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";

const STORAGE_KEY = "repaso_v1";
const WEEK_DAYS   = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function loadRepaso() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
  catch { return {}; }
}

function toDateKey(ts) {
  const d = new Date(ts);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function todayKey() { return toDateKey(Date.now()); }

function getMondayOf(date) {
  const d = new Date(date);
  const day = d.getUTCDay(); // 0=Sun, 1=Mon, ...
  const diff = (day === 0 ? -6 : 1 - day);
  return new Date(d.getTime() + diff * 86400000);
}

function addDays(date, n) {
  return new Date(date.getTime() + n * 86400000);
}

function monthLabel(date) {
  return date.toLocaleDateString("es-MX", { month: "long", year: "numeric", timeZone: "UTC" });
}

function dayNum(date) {
  return date.getUTCDate();
}

function isToday(date) {
  return toDateKey(date.getTime()) === todayKey();
}

export default function AgendaClient({ cardMap, classLog }) {
  const [repaso,      setRepaso]      = useState({});
  const [weekStart,   setWeekStart]   = useState(() => getMondayOf(new Date()));
  const [selDay,      setSelDay]      = useState(null);   // Date obj
  const [notifState,  setNotifState]  = useState("unknown"); // "granted"|"denied"|"default"|"unknown"

  useEffect(() => {
    setRepaso(loadRepaso());
    if ("Notification" in window) setNotifState(Notification.permission);
  }, []);

  // Build schedule: dateKey → { due: Card[], upcoming: Card[] }
  const schedule = useMemo(() => {
    const map = {};
    for (const [key, entry] of Object.entries(repaso)) {
      if (!entry?.nextReview) continue;
      const dk = toDateKey(entry.nextReview);
      if (!map[dk]) map[dk] = [];
      const meta = cardMap[key];
      if (meta) map[dk].push({ ...meta, box: entry.box, nextReview: entry.nextReview });
    }
    return map;
  }, [repaso, cardMap]);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  function prevWeek() { setWeekStart(d => addDays(d, -7)); setSelDay(null); }
  function nextWeek() { setWeekStart(d => addDays(d, 7)); setSelDay(null); }

  async function requestNotif() {
    if (!("Notification" in window)) { alert("Tu navegador no soporta notificaciones"); return; }
    const perm = await Notification.requestPermission();
    setNotifState(perm);
    if (perm === "granted") {
      const today = schedule[todayKey()] || [];
      new Notification("VibeLearning — Agenda de hoy", {
        body: today.length
          ? `Tienes ${today.length} concepto${today.length > 1 ? "s" : ""} para repasar hoy.`
          : "¡Al día! No tienes conceptos pendientes hoy.",
        icon: "/favicon.ico",
      });
    }
  }

  const todayCards  = schedule[todayKey()] || [];
  const totalDue    = Object.values(schedule).flat().filter(c => c.nextReview <= Date.now()).length;
  const selDateKey  = selDay ? toDateKey(selDay.getTime()) : null;
  const selCards    = selDateKey ? (schedule[selDateKey] || []) : [];
  const selClasses  = selDateKey ? (classLog[selDateKey] || null) : null;

  const weekLabel = (() => {
    const end = addDays(weekStart, 6);
    const sm  = weekStart.getUTCMonth();
    const em  = end.getUTCMonth();
    if (sm === em) {
      return `${weekStart.getUTCDate()} – ${end.getUTCDate()} de ${weekStart.toLocaleDateString("es-MX", { month: "long", timeZone: "UTC" })} ${weekStart.getUTCFullYear()}`;
    }
    return `${weekStart.getUTCDate()} ${weekStart.toLocaleDateString("es-MX", { month: "short", timeZone: "UTC" })} – ${end.getUTCDate()} ${end.toLocaleDateString("es-MX", { month: "short", timeZone: "UTC" })} ${end.getUTCFullYear()}`;
  })();

  const BOX_COLORS = ["#EF4444","#FBBF24","#22C55E","#60A5FA","#A78BFA","#7C6CF8"];

  return (
    <div style={{ display: "flex", gap: 20, flex: 1, minHeight: 0 }}>

      {/* Main calendar */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>

        {/* Week navigation */}
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-card)", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button onClick={prevWeek} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 14px", color: "var(--text-2)", fontSize: 13, cursor: "pointer" }}>← Anterior</button>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", textAlign: "center" }}>{weekLabel}</span>
          <button onClick={nextWeek} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 14px", color: "var(--text-2)", fontSize: 13, cursor: "pointer" }}>Siguiente →</button>
        </div>

        {/* Calendar grid */}
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-card)", overflow: "hidden" }}>
          {/* Day headers */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid var(--border)" }}>
            {WEEK_DAYS.map(d => (
              <div key={d} style={{ padding: "10px 0", textAlign: "center", fontSize: 11, fontWeight: 700, color: "var(--text-3)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
            {weekDays.map((day, i) => {
              const dk      = toDateKey(day.getTime());
              const due     = schedule[dk] || [];
              const classes = classLog[dk];
              const today   = isToday(day);
              const isSel   = selDay && toDateKey(selDay.getTime()) === dk;
              const isPast  = day < new Date(Date.now() - 86400000);

              return (
                <div
                  key={i}
                  onClick={() => setSelDay(isSel ? null : day)}
                  style={{
                    borderRight: i < 6 ? "1px solid var(--border)" : "none",
                    minHeight: 100, padding: "10px 8px",
                    background: isSel ? "var(--accent-dim)" : today ? "rgba(124,108,248,0.04)" : "transparent",
                    cursor: "pointer", transition: "background 130ms",
                  }}
                >
                  {/* Day number */}
                  <div style={{ marginBottom: 8 }}>
                    <span style={{
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      width: 28, height: 28, borderRadius: "50%",
                      background: today ? "var(--accent)" : "transparent",
                      fontSize: 13, fontWeight: today ? 700 : 500,
                      color: today ? "white" : isPast ? "var(--text-3)" : "var(--text)",
                    }}>
                      {dayNum(day)}
                    </span>
                  </div>

                  {/* Due cards */}
                  {due.length > 0 && (
                    <div style={{ marginBottom: 4 }}>
                      <div style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 6, padding: "3px 7px", display: "inline-block" }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#EF4444" }}>
                          {due.length} repaso{due.length > 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Classes */}
                  {classes && (
                    <div style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 6, padding: "3px 7px", display: "inline-block" }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: "#22C55E" }}>
                        {classes.count} clase{classes.count > 1 ? "s" : ""}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected day detail */}
        {selDay && (
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-card)", padding: "20px 24px" }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 14 }}>
              {selDay.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })}
            </p>

            {selClasses && (
              <div style={{ marginBottom: 14 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#22C55E", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 6 }}>Clases grabadas</p>
                {selClasses.titles.map((t, i) => (
                  <p key={i} style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 2 }}>· {t}</p>
                ))}
              </div>
            )}

            {selCards.length > 0 ? (
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#EF4444", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 8 }}>
                  Conceptos para repasar ({selCards.length})
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {selCards.slice(0, 10).map((c, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", borderRadius: 9 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: BOX_COLORS[c.box] || "#7C6CF8", flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.conceptName}</p>
                        <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 1 }}>{c.className} · Caja {c.box + 1}</p>
                      </div>
                    </div>
                  ))}
                  {selCards.length > 10 && <p style={{ fontSize: 12, color: "var(--text-3)", textAlign: "center" }}>+{selCards.length - 10} más</p>}
                </div>
                <Link href="/dashboard/repaso">
                  <button style={{ marginTop: 12, background: "var(--accent)", color: "white", border: "none", borderRadius: 9, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                    Ir a Repaso →
                  </button>
                </Link>
              </div>
            ) : (
              <p style={{ fontSize: 13, color: "var(--text-3)" }}>
                {selClasses ? "Sin conceptos para repasar este día." : "Sin actividad este día."}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Right panel */}
      <div style={{ width: 272, flexShrink: 0, display: "flex", flexDirection: "column", gap: 14 }}>

        {/* Today summary */}
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-card)", padding: 20 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 14 }}>Hoy</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, color: "var(--text-2)" }}>Para repasar</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: todayCards.length > 0 ? "#EF4444" : "#22C55E" }}>{todayCards.length}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, color: "var(--text-2)" }}>Total pendientes</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>{totalDue}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, color: "var(--text-2)" }}>Conceptos en SM-2</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>{Object.keys(repaso).length}</span>
            </div>
          </div>
          {todayCards.length > 0 && (
            <Link href="/dashboard/repaso">
              <button style={{ marginTop: 14, width: "100%", background: "var(--accent)", color: "white", border: "none", borderRadius: 10, padding: "10px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Repasar ahora ({todayCards.length})
              </button>
            </Link>
          )}
        </div>

        {/* Notifications */}
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-card)", padding: 20 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12 }}>Recordatorios</p>
          {notifState === "granted" ? (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22C55E" }} />
                <span style={{ fontSize: 13, color: "#22C55E", fontWeight: 600 }}>Notificaciones activas</span>
              </div>
              <p style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.6 }}>
                Recibirás un recordatorio cuando abras la app con conceptos pendientes.
              </p>
            </div>
          ) : notifState === "denied" ? (
            <div>
              <p style={{ fontSize: 13, color: "#EF4444", fontWeight: 500, marginBottom: 6 }}>Notificaciones bloqueadas</p>
              <p style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.6 }}>
                Ve a la configuración de tu navegador para permitir notificaciones de este sitio.
              </p>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.6, marginBottom: 12 }}>
                Activa las notificaciones para recibir un aviso cuando tengas conceptos para repasar.
              </p>
              <button onClick={requestNotif} style={{ width: "100%", background: "rgba(124,108,248,0.1)", border: "1px solid rgba(124,108,248,0.25)", borderRadius: 10, padding: "10px", fontSize: 13, fontWeight: 600, color: "var(--accent)", cursor: "pointer" }}>
                Activar notificaciones
              </button>
            </div>
          )}
        </div>

        {/* Legend */}
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-card)", padding: 20 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12 }}>Leyenda SM-2</p>
          {[
            { label: "Caja 1 — hoy",     color: "#EF4444" },
            { label: "Caja 2 — 1 día",   color: "#FBBF24" },
            { label: "Caja 3 — 3 días",  color: "#22C55E" },
            { label: "Caja 4 — 1 semana",color: "#60A5FA" },
            { label: "Caja 5 — 2 semanas",color:"#A78BFA" },
            { label: "Caja 6 — 1 mes",   color: "#7C6CF8" },
          ].map(({ label, color }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: "var(--text-2)" }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
