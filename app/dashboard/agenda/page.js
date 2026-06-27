import { createClient } from "@/lib/supabase/server";
import AgendaClient from "./AgendaClient";

export default async function AgendaPage() {
  const supabase = await createClient();
  const { data: raw } = await supabase
    .from("classes")
    .select("id, title, created_at, data")
    .order("created_at", { ascending: false });

  // Build cardMap: { [classId:conceptName]: { className, conceptName } }
  const cardMap = {};
  for (const c of (raw || [])) {
    for (const concept of (c.data?.concepts || [])) {
      const name = typeof concept === "string" ? concept : concept.name;
      if (name) cardMap[`${c.id}:${name}`] = { className: c.title, conceptName: name };
    }
  }

  // Daily class log: { [YYYY-MM-DD]: { count, titles } }
  const classLog = {};
  for (const c of (raw || [])) {
    const d   = new Date(c.created_at);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
    if (!classLog[key]) classLog[key] = { count: 0, titles: [] };
    classLog[key].count++;
    classLog[key].titles.push(c.title);
  }

  return (
    <div style={{ padding: "40px 48px", display: "flex", flexDirection: "column", gap: 28, height: "calc(100vh - 1px)", boxSizing: "border-box" }}>
      <div style={{ flexShrink: 0 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em" }}>Agenda</h1>
        <p style={{ fontSize: 14, color: "var(--text-2)", marginTop: 6 }}>
          Tu calendario de repaso basado en la curva del olvido
        </p>
      </div>
      <AgendaClient cardMap={cardMap} classLog={classLog} />
    </div>
  );
}
