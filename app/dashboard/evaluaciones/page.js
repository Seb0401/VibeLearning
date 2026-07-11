import { createClient } from "@/lib/supabase/server";
import EvaluacionesClient from "./EvaluacionesClient";

export default async function Evaluaciones() {
  const supabase = await createClient();
  const { data: raw } = await supabase
    .from("classes")
    .select("id, title, data, created_at")
    .order("created_at", { ascending: false });

  return <EvaluacionesClient classes={raw || []} />;
}
