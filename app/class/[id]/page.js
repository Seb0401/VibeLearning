import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import ClassPageClient from "./ClassPageClient";

export default async function ClassPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: cls } = await supabase
    .from("classes")
    .select("*")
    .eq("id", id)
    .single();

  if (!cls) notFound();

  return <ClassPageClient cls={cls} />;
}
