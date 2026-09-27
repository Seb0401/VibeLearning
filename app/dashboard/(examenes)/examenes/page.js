import { createClient } from "@/lib/supabase/server";
import ExamenesClient from "./ExamenesClient";

export default async function ExamenesPage() {
  const supabase = await createClient();
  const { data: raw } = await supabase
    .from("classes")
    .select("id, title")
    .order("created_at", { ascending: false });

  return (
    <div style={{ padding: "40px 48px", display: "flex", flexDirection: "column", gap: 28, height: "calc(100vh - 1px)", boxSizing: "border-box" }}>
      <div style={{ flexShrink: 0 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em" }}>Análisis de exámenes</h1>
        <p style={{ fontSize: 14, color: "var(--text-2)", marginTop: 6 }}>
          Sube una foto o PDF de tu examen y la IA lo califica y te da retroalimentación detallada
        </p>
      </div>
      <ExamenesClient classes={raw || []} />
    </div>
  );
}
