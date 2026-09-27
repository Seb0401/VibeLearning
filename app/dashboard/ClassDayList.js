"use client";
import ClassCard from "./ClassCard";

// Agrupa por día usando la zona horaria del navegador (no la del servidor, que en Vercel es UTC).
function startOfLocalDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function groupByDay(classes) {
  const todayStart     = startOfLocalDay(new Date());
  const yesterdayStart = todayStart - 86400000;
  const weekStart      = todayStart - 6 * 86400000;

  const seen = new Map();
  for (const c of classes) {
    const d  = new Date(c.created_at);
    const ds = startOfLocalDay(d);

    let label;
    if (ds === todayStart) {
      label = "Hoy";
    } else if (ds === yesterdayStart) {
      label = "Ayer";
    } else if (ds >= weekStart) {
      const raw = d.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "short" });
      label = raw.charAt(0).toUpperCase() + raw.slice(1);
    } else {
      label = d.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
    }

    if (!seen.has(label)) seen.set(label, []);
    seen.get(label).push(c);
  }
  return [...seen.entries()].map(([label, items]) => ({ label, items }));
}

export default function ClassDayList({ classes }) {
  const dayGroups = groupByDay(classes);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {dayGroups.map(({ label, items }) => (
        <div key={label}>
          {/* Day header */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
            <span suppressHydrationWarning style={{ fontSize: 11.5, fontWeight: 600, color: "var(--text-3)", letterSpacing: "0.05em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
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
