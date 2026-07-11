import { createClient } from "@/lib/supabase/server";
import MapaGlobalClient from "./MapaGlobalClient";

function buildMarkdown(classes) {
  const lines = ["# Mapa de Conocimiento"];
  for (const c of classes) {
    const concepts = (c.data?.concepts || []).map(x => typeof x === "string" ? x : x.name).filter(Boolean);
    if (concepts.length === 0) continue;
    lines.push(`## ${c.title}`);
    for (const name of concepts) lines.push(`### ${name}`);
  }
  return lines.join("\n");
}

export default async function MapaGlobal() {
  const supabase = await createClient();
  const { data: raw } = await supabase
    .from("classes")
    .select("id, title, data")
    .order("created_at", { ascending: false });

  const classes  = raw || [];
  const markdown = buildMarkdown(classes);

  return <MapaGlobalClient classes={classes} markdown={markdown} />;
}
