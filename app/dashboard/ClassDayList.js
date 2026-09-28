"use client";
import ClassCard from "./ClassCard";
import { dayKey, formatDate, useTimeZone } from "@/lib/timezone-client";

// Agrupa por día en la zona horaria del usuario (la misma en el servidor y en el navegador).
function groupByDay(classes, tz, now) {
  const today     = dayKey(now, tz);
  const yesterday = dayKey(now - 86400000, tz);
  const lastWeek  = new Set(Array.from({ length: 7 }, (_, i) => dayKey(now - i * 86400000, tz)));

  const seen = new Map();
  for (const c of classes) {
    const key = dayKey(c.created_at, tz);
    let label;
    if (key === today) {
      label = "Hoy";
    } else if (key === yesterday) {
      label = "Ayer";
    } else if (lastWeek.has(key)) {
      const raw = formatDate(c.created_at, { weekday: "long", day: "numeric", month: "short" }, tz);
      label = raw.charAt(0).toUpperCase() + raw.slice(1);
    } else {
      label = formatDate(c.created_at, { day: "numeric", month: "long", year: "numeric" }, tz);
    }
    if (!seen.has(label)) seen.set(label, []);
    seen.get(label).push(c);
  }
  return [...seen.entries()].map(([label, items]) => ({ label, items }));
}

export default function ClassDayList({ classes, now }) {
  const tz = useTimeZone();
  const dayGroups = groupByDay(classes, tz, now);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {dayGroups.map(({ label, items }) => (
        <div key={label}>
          {/* Day header */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--text-3)", letterSpacing: "0.05em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
              {label}
            </span>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            <span style={{ fontSize: 11, color: "var(--text-3)", whiteSpace: "nowrap" }}>
              {items.length} {items.length === 1 ? "clase" : "clases"}
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {items.map((c, i) => (
              <ClassCard key={c.id} c={c} idx={i} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
