import { createClient } from "@/lib/supabase/server";
import NotasClient from "./NotasClient";

export default async function Notas() {
  const supabase = await createClient();
  const { data: raw } = await supabase
    .from("classes")
    .select("*").neq("title", "Clase en progreso...")
    .order("created_at", { ascending: false });

  return <NotasClient classes={raw || []} />;
}
