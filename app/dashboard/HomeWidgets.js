"use client";
import { useEffect, useState } from "react";
import Button from "@/components/Button";
import { IconBadge } from "@/components/Icon";

/* ── Saludo según la hora local del navegador ─────────────────────────── */
function greetingFor(date) {
  const h = date.getHours();
  if (h < 6)  return "Buenas noches";
  if (h < 12) return "Buenos días";
  if (h < 20) return "Buenas tardes";
  return "Buenas noches";
}

export function Greeting({ name }) {
  const [now, setNow] = useState(null);
  // La hora solo se conoce en el navegador; en el servidor se muestra un saludo neutro.
  useEffect(() => {
    const id = setTimeout(() => setNow(new Date()), 0);
    return () => clearTimeout(id);
  }, []);

  const dateLabel = now
    ? now.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })
    : "";

  return (
    <div>
      <p style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-3)", letterSpacing: "0.04em", textTransform: "uppercase", minHeight: 18 }}>
        {dateLabel}
      </p>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em", marginTop: 4 }}>
        {now ? greetingFor(now) : "Hola"}, {name}
      </h1>
    </div>
  );
}

/* ── Repaso de hoy (el progreso del repaso espaciado vive en localStorage) ─ */
const STORAGE_KEY = "repaso_v1";

export function ReviewTodayCard({ cards }) {
  const [state, setState] = useState(null); // { due, mastered }

  useEffect(() => {
    let prog = {};
    try { prog = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch {}
    const now = Date.now();
    const due = cards.filter((k) => !prog[k] || now >= (prog[k].nextReview || 0)).length;
    const mastered = cards.filter((k) => prog[k]?.box >= 4).length;
    const id = setTimeout(() => setState({ due, mastered }), 0);
    return () => clearTimeout(id);
  }, [cards]);

  const total = cards.length;
  const due = state?.due ?? 0;
  const done = total > 0 && state && due === 0;

  return (
    <div className="ui-card ui-card--md">
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <IconBadge name={done ? "check-circle" : "repeat"} color={done ? "#22C55E" : "#F97316"} size={44} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Repaso de hoy</p>
          <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", marginTop: 3 }}>
            {!state ? "Calculando…" : total === 0 ? "Aún no hay conceptos" : done ? "Estás al día" : `${due} ${due === 1 ? "concepto pendiente" : "conceptos pendientes"}`}
          </p>
          {state && total > 0 && (
            <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>
              {state.mastered} de {total} dominados
            </p>
          )}
        </div>
      </div>
      {total > 0 && !done && (
        <Button href="/dashboard/repaso" variant="soft" block icon="repeat" style={{ marginTop: 16 }}>
          Empezar repaso
        </Button>
      )}
    </div>
  );
}
