import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUserTimeZone } from "@/lib/timezone";
import Avatar from "@/components/Avatar";
import Mascot from "@/components/Mascot";
import Icon, { IconBadge } from "@/components/Icon";
import PerfilClient from "./PerfilClient";

function streakDays(classes, tz, now) {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" });
  const days = new Set(classes.map((c) => fmt.format(new Date(c.created_at))));
  let s = 0;
  for (let i = 0; i < 365; i++) {
    if (days.has(fmt.format(new Date(now - i * 86400000)))) s++;
    else if (i > 0) break;
  }
  return s;
}

export default async function PerfilPage() {
  const supabase = await createClient();
  const [{ data: { user } }, { data: raw }, tz] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("classes").select("created_at, data").neq("title", "Clase en progreso...").order("created_at", { ascending: false }),
    getUserTimeZone(),
  ]);
  const classes = raw || [];
  // eslint-disable-next-line react-hooks/purity -- Server Component: se renderiza una vez por request
  const now = Date.now();
  const rawName = user?.email?.split("@")[0] || "alumno";
  const name = rawName.charAt(0).toUpperCase() + rawName.slice(1);
  const since = user?.created_at ? new Date(user.created_at).toLocaleDateString("es-MX", { month: "long", year: "numeric", timeZone: tz }) : null;
  const concepts = classes.reduce((s, c) => s + (c.data?.concepts?.length || 0), 0);
  const quiz = classes.reduce((a, c) => { const q = c.data?.quiz_stats; if (q?.total) { a.t += q.total; a.c += q.correct || 0; } return a; }, { t: 0, c: 0 });
  const stats = [
    { icon: "book",      color: "#7C6CF8", value: classes.length,                   label: "Clases" },
    { icon: "lightbulb", color: "#FBBF24", value: concepts,                          label: "Conceptos" },
    { icon: "flame",     color: "#F97316", value: `${streakDays(classes, tz, now)} d`, label: "Racha" },
    { icon: "target",    color: "#22C55E", value: quiz.t ? `${Math.round((quiz.c / quiz.t) * 100)}%` : "—", label: "Aciertos" },
  ];

  return (
    <div className="page-pad" style={{ maxWidth: 820, display: "flex", flexDirection: "column", gap: 20 }}>
      <section className="profile-hero">
        <Avatar size={84} ring />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.02em" }}>{name}</h1>
          <p style={{ fontSize: 13.5, color: "var(--text-2)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis" }}>{user?.email}</p>
          {since && <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 4 }}>Estudiante desde {since}</p>}
        </div>
        <Mascot pose="perfil" size={110} halo={false} style={{ marginRight: -6 }} />
      </section>

      <div className="profile-stats">
        {stats.map((s) => (
          <div key={s.label} className="ui-card ui-card--sm" style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <IconBadge name={s.icon} color={s.color} size={38} />
            <div>
              <p style={{ fontSize: 19, fontWeight: 800, color: "var(--text)", lineHeight: 1.1 }}>{s.value}</p>
              <p style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 2 }}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="ui-card" style={{ padding: 8 }}>
        {[
          { href: "/dashboard/logros",       icon: "trophy",    title: "Logros",       hint: "Insignias y nivel de XP" },
          { href: "/dashboard/estadisticas", icon: "bar-chart", title: "Estadísticas", hint: "Tu actividad semanal" },
          { href: "/dashboard/historial",    icon: "clock",     title: "Historial",    hint: "Todas tus clases" },
        ].map((l) => (
          <Link key={l.href} href={l.href} className="settings-row settings-row--button">
            <span className="settings-row__icon"><Icon name={l.icon} size={18} /></span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="settings-row__title">{l.title}</p>
              <p className="settings-row__hint">{l.hint}</p>
            </div>
            <Icon name="chevron-right" size={18} />
          </Link>
        ))}
      </div>

      <PerfilClient sidebarPages={user?.user_metadata?.sidebar_pages} />
    </div>
  );
}
