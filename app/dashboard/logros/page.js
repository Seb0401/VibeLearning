import { createClient } from "@/lib/supabase/server";

const XP_PER_LEVEL = 500;

const ACHIEVEMENTS = [
  // Clases
  { id: "c1",  emoji: "⚡", name: "Primer paso",     desc: "Guarda tu primera clase",         cat: "Clases",   xp: 50,  check: s => s.classes >= 1   },
  { id: "c5",  emoji: "🗺️", name: "Explorador",      desc: "Completa 5 clases",               cat: "Clases",   xp: 100, check: s => s.classes >= 5   },
  { id: "c10", emoji: "📚", name: "Estudioso",        desc: "Completa 10 clases",              cat: "Clases",   xp: 200, check: s => s.classes >= 10  },
  { id: "c25", emoji: "🎓", name: "Académico",        desc: "Completa 25 clases",              cat: "Clases",   xp: 400, check: s => s.classes >= 25  },
  { id: "c50", emoji: "🏛️", name: "Maestro",          desc: "Completa 50 clases",              cat: "Clases",   xp: 800, check: s => s.classes >= 50  },
  // Conceptos
  { id: "k10", emoji: "💡", name: "Curioso",          desc: "Aprende 10 conceptos",            cat: "Conceptos",xp: 50,  check: s => s.concepts >= 10  },
  { id: "k50", emoji: "🧠", name: "Conceptual",       desc: "Aprende 50 conceptos",            cat: "Conceptos",xp: 150, check: s => s.concepts >= 50  },
  { id: "k100",emoji: "🏆", name: "Centenario",       desc: "Aprende 100 conceptos",           cat: "Conceptos",xp: 300, check: s => s.concepts >= 100 },
  { id: "k250",emoji: "🌟", name: "Erudito",          desc: "Aprende 250 conceptos",           cat: "Conceptos",xp: 600, check: s => s.concepts >= 250 },
  // PDFs
  { id: "p1",  emoji: "📄", name: "Lector",           desc: "Sube tu primer material PDF",     cat: "PDF",      xp: 75,  check: s => s.pdfs >= 1  },
  { id: "p5",  emoji: "📖", name: "Bibliófilo",       desc: "Sube 5 materiales PDF",           cat: "PDF",      xp: 200, check: s => s.pdfs >= 5  },
  { id: "p10", emoji: "🗄️", name: "Archivista",       desc: "Sube 10 materiales PDF",          cat: "PDF",      xp: 400, check: s => s.pdfs >= 10 },
  // Racha
  { id: "s3",  emoji: "🔥", name: "En racha",         desc: "3 días de estudio seguidos",      cat: "Racha",    xp: 100, check: s => s.streak >= 3  },
  { id: "s7",  emoji: "🏅", name: "Semana perfecta",  desc: "7 días de estudio seguidos",      cat: "Racha",    xp: 250, check: s => s.streak >= 7  },
  { id: "s30", emoji: "🚀", name: "Imparable",        desc: "30 días de estudio seguidos",     cat: "Racha",    xp: 750, check: s => s.streak >= 30 },
  // Horas
  { id: "h5",  emoji: "⏱️", name: "Dedicado",         desc: "Acumula 5 horas de clase",        cat: "Tiempo",   xp: 150, check: s => s.hours >= 5  },
  { id: "h20", emoji: "⌛", name: "Maratonista",      desc: "Acumula 20 horas de clase",       cat: "Tiempo",   xp: 350, check: s => s.hours >= 20 },
  { id: "h50", emoji: "🎯", name: "Incansable",       desc: "Acumula 50 horas de clase",       cat: "Tiempo",   xp: 700, check: s => s.hours >= 50 },
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

function Badge({ emoji, name, desc, xp, unlocked, progress }) {
  return (
    <div style={{
      background: unlocked ? "var(--card)" : "rgba(255,255,255,0.02)",
      border: `1px solid ${unlocked ? "rgba(124,108,248,0.25)" : "var(--border)"}`,
      borderRadius: "var(--radius-card)",
      padding: "20px",
      display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
      opacity: unlocked ? 1 : 0.5,
      position: "relative", overflow: "hidden",
    }}>
      {unlocked && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, var(--accent), #A78BFA)" }}/>
      )}
      <div style={{ fontSize: 36, filter: unlocked ? "none" : "grayscale(100%)" }}>{emoji}</div>
      <p style={{ fontSize: 13, fontWeight: 700, color: unlocked ? "var(--text)" : "var(--text-3)", textAlign: "center" }}>{name}</p>
      <p style={{ fontSize: 11, color: "var(--text-3)", textAlign: "center", lineHeight: 1.4 }}>{desc}</p>
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: unlocked ? "var(--accent)" : "var(--text-3)" }}>+{xp} XP</span>
        {unlocked && <span style={{ fontSize: 10, color: "#22C55E" }}>✓</span>}
      </div>
    </div>
  );
}

export default async function LogrosPage() {
  const supabase = await createClient();
  const { data: raw } = await supabase.from("classes").select("*").order("created_at", { ascending: false });
  const classes = raw || [];

  const words = c => (c.data?.transcript || "").trim().split(/\s+/).filter(Boolean).length;
  const stats = {
    classes:  classes.length,
    concepts: classes.reduce((s, c) => s + (c.data?.concepts?.length || 0), 0),
    pdfs:     classes.filter(c => c.data?.material_summary).length,
    hours:    classes.reduce((s, c) => s + words(c) / 130 / 60, 0),
    streak:   computeStreak(classes),
  };

  const unlocked   = ACHIEVEMENTS.filter(a => a.check(stats));
  const locked     = ACHIEVEMENTS.filter(a => !a.check(stats));
  const totalXP    = unlocked.reduce((s, a) => s + a.xp, 0);
  const level      = Math.floor(totalXP / XP_PER_LEVEL) + 1;
  const xpInLevel  = totalXP % XP_PER_LEVEL;
  const xpPct      = xpInLevel / XP_PER_LEVEL;

  const STAT_ROWS = [
    { label: "Clases",    value: stats.classes  },
    { label: "Conceptos", value: stats.concepts  },
    { label: "PDFs",      value: stats.pdfs      },
    { label: "Horas",     value: stats.hours.toFixed(1) },
    { label: "Racha",     value: `${stats.streak}d`    },
    { label: "Logros",    value: `${unlocked.length}/${ACHIEVEMENTS.length}` },
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
      <div style={{ display: "flex", gap: 16, alignItems: "stretch" }}>
        {/* XP / Level */}
        <div style={{ flex: 1, background: "var(--card)", border: "1px solid rgba(124,108,248,0.25)", borderRadius: "var(--radius-card)", padding: "28px 32px", position: "relative", overflow: "hidden" }}>
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, flex: 1 }}>
          {STAT_ROWS.map(({ label, value }) => (
            <div key={label} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-card)", padding: "16px 20px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <p style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em" }}>{value}</p>
              <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 3 }}>{label}</p>
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
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-card)", padding: 48, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🏆</div>
          <p style={{ fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>Empieza a desbloquear logros</p>
          <p style={{ fontSize: 13, color: "var(--text-2)" }}>Graba tu primera clase para comenzar tu aventura</p>
        </div>
      )}
    </div>
  );
}
