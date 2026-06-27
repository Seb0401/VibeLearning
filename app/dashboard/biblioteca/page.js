import { createClient } from "@/lib/supabase/server";
import BibliotecaClient from "./BibliotecaClient";

export default async function Biblioteca() {
  const supabase = await createClient();
  const { data: raw } = await supabase
    .from("classes")
    .select("*")
    .order("created_at", { ascending: false });

  return <BibliotecaClient classes={raw || []} />;
}
