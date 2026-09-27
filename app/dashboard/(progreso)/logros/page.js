import { createClient } from "@/lib/supabase/server";
import Icon, { IconBadge } from "@/components/Icon";
import EmptyState from "@/components/EmptyState";

const XP_PER_LEVEL = 500;

const CAT = {
  Clases:    { color: "#7C6CF8", metric: "classes",  unit: "clases"    },
  Conceptos: { color: "#FBBF24", metric: "concepts", unit: "conceptos" },
  PDF:       { color: "#60A5FA", metric: "pdfs",     unit: "PDFs"      },
  Racha:     { color: "#F97316", metric: "streak",   unit: "días"      },
  Tiempo:    { color: "#22C55E", metric: "hours",    unit: "horas"     },
};

const ACHIEVEMENTS = [
  // Clases
  { id: "c1",   icon: "zap",        name: "Primer paso",     desc: "Guarda tu primera clase",     cat: "Clases",    xp: 50,  goal: 1   },
  { id: "c5",   icon: "compass",    name: "Explorador",      desc: "Completa 5 clases",           cat: "Clases",    xp: 100, goal: 5   },
  { id: "c10",  icon: "book",       name: "Estudioso",       desc: "Completa 10 clases",          cat: "Clases",    xp: 200, goal: 10  },
  { id: "c25",  icon: "graduation", name: "Académico",       desc: "Completa 25 clases",          cat: "Clases",    xp: 400, goal: 25  },
  { id: "c50",  icon: "landmark",   name: "Maestro",         desc: "Completa 50 clases",          cat: "Clases",    xp: 800, goal: 50  },
  // Conceptos
  { id: "k10",  icon: "lightbulb",  name: "Curioso",         desc: "Aprende 10 conceptos",        cat: "Conceptos", xp: 50,  goal: 10  },
  { id: "k50",  icon: "brain",      name: "Conceptual",      desc: "Aprende 50 conceptos",        cat: "Conceptos", xp: 150, goal: 50  },
  { id: "k100", icon: "trophy",     name: "Centenario",      desc: "Aprende 100 conceptos",       cat: "Conceptos", xp: 300, goal: 100 },
  { id: "k250", icon: "star",       name: "Erudito",         desc: "Aprende 250 conceptos",       cat: "Conceptos", xp: 600, goal: 250 },
  // PDFs
  { id: "p1",   icon: "file-text",  name: "Lector",          desc: "Sube tu primer material PDF", cat: "PDF",       xp: 75,  goal: 1   },
  { id: "p5",   icon: "book-open",  name: "Bibliófilo",      desc: "Sube 5 materiales PDF",       cat: "PDF",       xp: 200, goal: 5   },
  { id: "p10",  icon: "archive",    name: "Archivista",      desc: "Sube 10 materiales PDF",      cat: "PDF",       xp: 400, goal: 10  },
  // Racha
  { id: "s3",   icon: "flame",      name: "En racha",        desc: "3 días de estudio seguidos",  cat: "Racha",     xp: 100, goal: 3   },
  { id: "s7",   icon: "medal",      name: "Semana perfecta", desc: "7 días de estudio seguidos",  cat: "Racha",     xp: 250, goal: 7   },
  { id: "s30",  icon: "rocket",     name: "Imparable",       desc: "30 días de estudio seguidos", cat: "Racha",     xp: 750, goal: 30  },
  // Horas
  { id: "h5",   icon: "clock",      name: "Dedicado",        desc: "Acumula 5 horas de clase",    cat: "Tiempo",    xp: 150, goal: 5   },
  { id: "h20",  icon: "hourglass",  name: "Maratonista",     desc: "Acumula 20 horas de clase",   cat: "Tiempo",    xp: 350, goal: 20  },
  { id: "h50",  icon: "target",     name: "Incansable",      desc: "Acumula 50 horas de clase",   cat: "Tiempo",    xp: 700, goal: 50  },
];

function computeStreak(classes) {
  const days = new Set(classes.map(c => {
    const d = new Date(c.created_at);
    return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
  }));
  let streak = 0;
  const now  = new Date();
  let cur    = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  for (let i = 0; i < 365; i++) {
    const k = `${cur.getUTCFullYear()}-${cur.getUTCMonth()}-${cur.getUTCDate()}`;
    if (days.has(k)) {
      streak++;
    } else if (streak > 0) {
      break;
    } else if (i > 1) {
      break; // more than 1 day grace period
    }
    cur = new Date(cur.getTime() - 86400000);
  }
  return streak;
}

function Badge({ icon, name, desc, xp, cat, goal, value, unlocked }) {
  const { color, unit } = CAT[cat];
  const current = Math.min(goal, Math.floor(value));
  const pct = Math.round((current / goal) * 100);
  return (
    <div className={unlocked ? "card-lift" : undefined} style={{
      background: unlocked ? "var(--card)" : "rgba(255,255,255,0.02)",
      border: `1px solid ${unlocked ? `color-mix(in srgb, ${color} 30%, transparent)` : "var(--border)"}`,
      borderRadius: "var(--radius-card)",
      padding: "20px 16px 16px",
      display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
      position: "relative", overflow: "hidden",
    }}>
      {unlocked && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: color }}/>
      )}
      <IconBadge name={icon} color={color} size={52} locked={!unlocked} />
      <p style={{ fontSize: 13, fontWeight: 700, color: unlocked ? "var(--text)" : "var(--text-2)", textAlign: "center", marginTop: 4 }}>{name}</p>
      <p style={{ fontSize: 11.5, color: "var(--text-3)", textAlign: "center", lineHeight: 1.4 }}>{desc}</p>
      {unlocked ? (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 4, fontSize: 11, fontWeight: 700, color }}>
          <Icon name="check" size={12} strokeWidth={2.5} /> +{xp} XP
        </span>
      ) : (
        <div style={{ width: "100%", marginTop: 4 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: "var(--text-3)", marginBottom: 5 }}>
            <span>{current}/{goal} {unit}</span>
            <span>+{xp} XP</span>
          </div>
          <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: color, opacity: 0.7, borderRadius: 99 }} />
          </div>
        </div>
      )}
    </div>
  );
}

export default async function LogrosPage() {
  const supabase = await createClient();
  const { data: raw } = await supabase.from("classes").select("*").neq("title", "Clase en progreso...").order("created_at", { ascending: false });
  const classes = raw || [];

  const words = c => (c.data?.transcript || "").trim().split(/\s+/).filter(Boolean).length;
  const stats = {
    classes:  classes.length,
    concepts: classes.reduce((s, c) => s + (c.data?.concepts?.length || 0), 0),
    pdfs:     classes.filter(c => c.data?.material_summary).length,
    hours:    classes.reduce((s, c) => s + words(c) / 130 / 60, 0),
    streak:   computeStreak(classes),
  };

  const withValue  = ACHIEVEMENTS.map(a => ({ ...a, value: stats[CAT[a.cat].metric] }));
  const unlocked   = withValue.filter(a => a.value >= a.goal);
  // Los bloqueados más cercanos a completarse van primero.
  const locked     = withValue.filter(a => a.value < a.goal).sort((a, b) => b.value / b.goal - a.value / a.goal);
  const totalXP    = unlocked.reduce((s, a) => s + a.xp, 0);
  const level      = Math.floor(totalXP / XP_PER_LEVEL) + 1;
  const xpInLevel  = totalXP % XP_PER_LEVEL;
  const xpPct      = xpInLevel / XP_PER_LEVEL;

  const STAT_ROWS = [
    { label: "Clases",    value: stats.classes,                               icon: "book",      color: CAT.Clases.color    },
    { label: "Conceptos", value: stats.concepts,                              icon: "lightbulb", color: CAT.Conceptos.color },
    { label: "PDFs",      value: stats.pdfs,                                  icon: "file-text", color: CAT.PDF.color       },
    { label: "Horas",     value: stats.hours.toFixed(1),                      icon: "clock",     color: CAT.Tiempo.color    },
    { label: "Racha",     value: `${stats.streak} d`,                         icon: "flame",     color: CAT.Racha.color     },
    { label: "Logros",    value: `${unlocked.length}/${ACHIEVEMENTS.length}`, icon: "trophy",    color: "#A78BFA"           },
  ];

  return (
    <div style={{ padding: "40px 48px", display: "flex", flexDirection: "column", gap: 32 }}>

      {/* Header */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em" }}>Logros</h1>
        <p style={{ fontSize: 14, color: "var(--text-2)", marginTop: 6 }}>
          Tu progreso gamificado como estudiante
        </p>
      </div>

      {/* Level card + stats */}
      <div style={{ display: "flex", gap: 16, alignItems: "stretch", flexWrap: "wrap" }}>
        {/* XP / Level */}
        <div style={{ flex: "1 1 320px", background: "var(--card)", border: "1px solid rgba(124,108,248,0.25)", borderRadius: "var(--radius-card)", padding: "28px 32px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg, var(--accent), #A78BFA, #60A5FA)" }}/>
          <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 20 }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg, var(--accent), #A78BFA)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 8px 24px rgba(124,108,248,0.35)" }}>
              <span style={{ fontSize: 28, fontWeight: 900, color: "white" }}>{level}</span>
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Nivel {level}</p>
              <p style={{ fontSize: 24, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em", marginTop: 2 }}>{totalXP.toLocaleString()} XP</p>
              <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>
                {XP_PER_LEVEL - xpInLevel} XP para el siguiente nivel
              </p>
            </div>
          </div>
          <div style={{ height: 8, background: "rgba(255,255,255,0.07)", borderRadius: 99 }}>
            <div style={{ height: "100%", width: `${xpPct * 100}%`, background: "linear-gradient(90deg, var(--accent), #A78BFA)", borderRadius: 99, transition: "width 0.8s ease" }}/>
          </div>
        </div>

        {/* Stats grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12, flex: "1 1 320px" }}>
          {STAT_ROWS.map(({ label, value, icon, color }) => (
            <div key={label} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-card)", padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <IconBadge name={icon} color={color} size={34} />
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 19, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em", lineHeight: 1.1 }}>{value}</p>
                <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 3 }}>{label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Unlocked achievements */}
      {unlocked.length > 0 && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>Desbloqueados ({unlocked.length})</h2>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }}/>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
            {unlocked.map(a => (
              <Badge key={a.id} {...a} unlocked={true}/>
            ))}
          </div>
        </div>
      )}

      {/* Locked achievements */}
      {locked.length > 0 && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-3)" }}>Bloqueados ({locked.length})</h2>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }}/>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
            {locked.map(a => (
              <Badge key={a.id} {...a} unlocked={false}/>
            ))}
          </div>
        </div>
      )}

      {classes.length === 0 && (
        <EmptyState icon="trophy" title="Empieza a desbloquear logros" text="Graba tu primera clase para empezar a sumar XP." action={{ href: "/class/new", label: "Iniciar clase" }} />
      )}
    </div>
  );
}
