import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Logo from "@/components/Logo";
import Mascot from "@/components/Mascot";
import Icon from "@/components/Icon";

const FEATURES = [
  { icon: "mic",       label: "Graba",       tone: "#FBBF24" },
  { icon: "file-text", label: "Transcribe",  tone: "#A78BFA" },
  { icon: "cards",     label: "Repasa",      tone: "#34D399" },
  { icon: "calendar",  label: "Organiza",    tone: "#FDBA74" },
  { icon: "bar-chart", label: "Mejora",      tone: "#60A5FA" },
];

// Portada de bienvenida (sin sesión). Con sesión, directo al dashboard.
export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <main className="welcome">
      <div className="welcome__glow" aria-hidden="true" />
      <div className="welcome__content fade-up">
        <Logo size={64} textSize={46} light />
        <h1 className="welcome__title">Tu estudio, más fácil y dinámico</h1>
        <p className="welcome__subtitle">Graba tu clase, obtén la transcripción en vivo, responde preguntas mientras aprendes y repasa con tu resumen y mapa mental.</p>

        <Mascot pose="menu" size={230} float priority halo={false} style={{ margin: "8px auto 4px" }} />

        <div className="welcome__actions">
          <Link href="/login?mode=signup" className="welcome__primary">Comenzar</Link>
          <Link href="/login" className="welcome__secondary">Iniciar sesión</Link>
        </div>

        <ul className="welcome__features" aria-label="Qué puedes hacer">
          {FEATURES.map((f) => (
            <li key={f.label}>
              <span className="welcome__feature-icon" style={{ color: f.tone }}><Icon name={f.icon} size={20} /></span>
              {f.label}
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
