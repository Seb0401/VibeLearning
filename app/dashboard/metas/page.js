import { createClient } from "@/lib/supabase/server";
import MetasClient from "./MetasClient";

function computeStreak(classes) {
  const days = new Set(
    classes.map(c => {
      const d = new Date(c.created_at);
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    })
  );
  let streak = 0;
  const now = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    if (days.has(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`)) streak++;
    else if (i > 0) break;
  }
  return streak;
}

export default async function Metas() {
  const supabase = await createClient();
  const { data: raw } = await supabase
    .from("classes")
    .select("id, created_at, data")
    .order("created_at", { ascending: false });

  const classes = raw || [];

  const now       = new Date();
  const weekAgo   = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const stats = {
    weekClasses:   classes.filter(c => new Date(c.created_at) >= weekAgo).length,
    monthConcepts: classes
      .filter(c => new Date(c.created_at) >= monthStart)
      .reduce((s, c) => s + (c.data?.concepts?.length || 0), 0),
    monthPdfs: classes
      .filter(c => new Date(c.created_at) >= monthStart && c.data?.material_summary)
      .length,
    streak: computeStreak(classes),
  };

  return <MetasClient stats={stats} />;
}
