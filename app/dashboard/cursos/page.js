import { createClient } from "@/lib/supabase/server";
import CursosClient from "./CursosClient";

export default async function CursosPage() {
  const supabase = await createClient();
  const { data: raw } = await supabase
    .from("classes")
    .select("id, title, created_at, data")
    .order("created_at", { ascending: false });

  const classes = (raw || []).map(c => ({
    id:         c.id,
    title:      c.title,
    created_at: c.created_at,
    data:       { concepts: c.data?.concepts || [] },
  }));

  return (
    <div style={{ padding: "40px 48px", display: "flex", flexDirection: "column", gap: 28, height: "calc(100vh - 1px)", boxSizing: "border-box" }}>
      <div style={{ flexShrink: 0 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em" }}>Cursos</h1>
        <p style={{ fontSize: 14, color: "var(--text-2)", marginTop: 6 }}>
          Agrupa tus clases en cursos para organizar tu aprendizaje
        </p>
      </div>
      <CursosClient classes={classes} />
    </div>
  );
}
