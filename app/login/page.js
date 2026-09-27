"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import BrandLogo from "@/components/Logo";
import Mascot from "@/components/Mascot";
import AppIcon from "@/components/Icon";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.7 33.3 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C33.9 6.7 29.2 5 24 5 13 5 4 14 4 24s9 19 20 19c10 0 19-7 19-19 0-1.3-.2-2.7-.4-4z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.8 19 13 24 13c3 0 5.7 1.1 7.8 2.9l5.7-5.7C33.9 6.7 29.2 5 24 5c-7.7 0-14.4 4.1-17.7 9.7z"/>
      <path fill="#4CAF50" d="M24 43c5.2 0 9.9-1.7 13.5-4.6l-6.2-5.2C29.4 34.8 26.8 36 24 36c-5.3 0-9.7-2.7-11.3-7H6.3l-6.6 4.8C3.6 39 13.3 43 24 43z"/>
      <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2c4-3.7 6.6-9.2 6.6-15.8 0-1.3-.2-2.7-.4-4z"/>
    </svg>
  );
}

function EyeIcon({ off }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {off ? (
        <>
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
          <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/>
          <line x1="1" y1="1" x2="23" y2="23"/>
        </>
      ) : (
        <>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
          <circle cx="12" cy="12" r="3"/>
        </>
      )}
    </svg>
  );
}

// Traduce los errores más comunes de Supabase Auth a mensajes claros en español.
function friendlyError(err) {
  const msg = (err?.message || String(err || "")).toLowerCase();
  if (msg.includes("invalid login credentials")) return "Correo o contraseña incorrectos.";
  if (msg.includes("user already registered")) return "Ya existe una cuenta con este correo. Inicia sesión.";
  if (msg.includes("password should be at least")) return "La contraseña debe tener al menos 6 caracteres.";
  if (msg.includes("email not confirmed")) return "Debes confirmar tu correo antes de entrar.";
  if (msg.includes("rate limit")) return "Demasiados intentos. Espera un momento y vuelve a intentarlo.";
  if (msg.includes("failed to fetch") || msg.includes("network") || msg.includes("fetch"))
    return "No se pudo conectar con el servidor. Revisa tu conexión o la configuración de Supabase.";
  return err?.message || "Ocurrió un error inesperado.";
}

const LABEL = {
  display: "block", fontSize: 11, fontWeight: 700, color: "var(--text-3)",
  marginBottom: 7, letterSpacing: "0.06em", textTransform: "uppercase",
};

export default function LoginPage() {
  const supabase = createClient();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd]   = useState(false);
  const [mode, setMode]         = useState("signin");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const isSignin = mode === "signin";
  const busy = loading || googleLoading;

  async function handleGoogle() {
    setError("");
    setGoogleLoading(true);
    try {
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || location.origin}/auth/callback` },
      });
      if (err) throw err;
    } catch (err) {
      setError(friendlyError(err));
      setGoogleLoading(false);
    }
  }

  async function handleEmail(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { error: err } = isSignin
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
      if (err) throw err;
      window.location.href = "/dashboard";
    } catch (err) {
      setError(friendlyError(err));
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--bg)", padding: "1rem", position: "relative", overflow: "hidden",
    }}>
      {/* Ambient glow */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 70% 50% at 50% -10%, rgba(124,108,248,0.22), transparent)" }} />
      <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(124,108,248,0.07), transparent 70%)",
        top: "5%", right: "-15%", pointerEvents: "none" }} />
      <div style={{ position: "absolute", width: 350, height: 350, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(167,139,250,0.05), transparent 70%)",
        bottom: "5%", left: "-8%", pointerEvents: "none" }} />

      <div className="login-shell">
      {/* Panel de marca (se oculta en móvil) */}
      <aside className="login-brand" aria-hidden="true">
        <BrandLogo size={46} textSize={34} />
        <p style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", marginTop: 16, lineHeight: 1.4 }}>
          Graba · Transcribe · Aprende
        </p>
        <p style={{ fontSize: 14, color: "var(--text-2)", marginTop: 4 }}>Todo en un solo lugar.</p>
        <Mascot pose="hola" size={260} float priority style={{ margin: "26px 0 10px" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
          {[
            ["mic", "Transcripción de tu clase en vivo"],
            ["zap", "Preguntas de active recall mientras aprendes"],
            ["sparkles", "Resumen y mapa mental al terminar"],
          ].map(([icon, text]) => (
            <span key={text} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13.5, color: "var(--text-2)", fontWeight: 600 }}>
              <span style={{ width: 30, height: 30, borderRadius: 10, background: "var(--accent-dim)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <AppIcon name={icon} size={15} />
              </span>
              {text}
            </span>
          ))}
        </div>
      </aside>

      <main className="fade-up" style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 400 }}>
        {/* Card */}
        <div style={{
          background: "var(--card-glass)",
          border: "1px solid var(--tint-4)",
          borderRadius: 24,
          padding: "clamp(28px, 6vw, 40px) clamp(22px, 6vw, 36px)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          boxShadow: "var(--login-card-shadow)",
        }}>

          {/* Logo + title */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 28 }}>
            <div className="login-card-mascot"><Mascot pose="hola" size={96} priority /></div>
            <h1 style={{ marginBottom: 8 }}>
              <BrandLogo size={34} textSize={25} />
            </h1>
            <p style={{ fontSize: 13, color: "var(--text-2)", textAlign: "center", lineHeight: 1.5 }}>
              {isSignin ? "Bienvenido de nuevo. Inicia sesión para continuar." : "Crea tu cuenta gratis y empieza a aprender con IA."}
            </p>
          </div>

          {/* Mode switch */}
          <div role="tablist" aria-label="Modo de acceso" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, padding: 4, background: "var(--tint-2)", border: "1px solid var(--border)", borderRadius: 12, marginBottom: 20 }}>
            {[["signin", "Iniciar sesión"], ["signup", "Crear cuenta"]].map(([key, label]) => {
              const active = mode === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => { setMode(key); setError(""); }}
                  style={{
                    padding: "8px 10px", borderRadius: 9, border: "none", cursor: "pointer",
                    fontSize: 13, fontWeight: 600,
                    background: active ? "var(--accent)" : "transparent",
                    color: active ? "white" : "var(--text-2)",
                    boxShadow: active ? "0 4px 14px rgba(124,108,248,0.3)" : "none",
                    transition: "background 150ms, color 150ms",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Google */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={busy}
            className="btn-ghost"
            style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              padding: "11px 16px",
              background: "var(--tint-2)",
              border: "1px solid var(--tint-4)",
              borderRadius: 12, color: "var(--text)", fontSize: 14, fontWeight: 500,
              cursor: busy ? "not-allowed" : "pointer", marginBottom: 20,
              opacity: busy && !googleLoading ? 0.6 : 1,
            }}
          >
            {googleLoading ? <span className="spinner" /> : <GoogleIcon />}
            {googleLoading ? "Redirigiendo a Google…" : "Continuar con Google"}
          </button>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: "var(--tint-3)" }} />
            <span style={{ fontSize: 12, color: "var(--text-3)", flexShrink: 0, letterSpacing: "0.03em" }}>
              o con tu email
            </span>
            <div style={{ flex: 1, height: 1, background: "var(--tint-3)" }} />
          </div>

          {/* Form */}
          <form onSubmit={handleEmail} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label htmlFor="email" style={LABEL}>Correo electrónico</label>
              <input
                id="email"
                className="input"
                value={email}
                onChange={e => setEmail(e.target.value)}
                type="email"
                autoComplete="email"
                placeholder="tu@email.com"
                required
              />
            </div>

            <div>
              <label htmlFor="password" style={LABEL}>Contraseña</label>
              <div style={{ position: "relative" }}>
                <input
                  id="password"
                  className="input"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  type={showPwd ? "text" : "password"}
                  autoComplete={isSignin ? "current-password" : "new-password"}
                  placeholder="••••••••"
                  minLength={6}
                  required
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  aria-label={showPwd ? "Ocultar contraseña" : "Mostrar contraseña"}
                  className="link-muted"
                  style={{
                    position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)",
                    width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
                    background: "none", border: "none", borderRadius: 8, color: "var(--text-3)", cursor: "pointer",
                  }}
                >
                  <EyeIcon off={showPwd} />
                </button>
              </div>
              {!isSignin && (
                <p style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 6 }}>Mínimo 6 caracteres.</p>
              )}
            </div>

            {/* Error */}
            {error && (
              <div role="alert" style={{
                padding: "10px 14px",
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.22)",
                borderRadius: 10, color: "var(--red)", fontSize: 13, lineHeight: 1.5,
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="btn-accent"
              style={{
                width: "100%", padding: "13px",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                background: busy ? "rgba(124,108,248,0.45)" : "linear-gradient(135deg, #7C6CF8 0%, #A78BFA 100%)",
                border: "none", borderRadius: 12,
                color: "white", fontSize: 15, fontWeight: 700,
                cursor: busy ? "not-allowed" : "pointer",
                boxShadow: busy ? "none" : "0 8px 28px rgba(124,108,248,0.35)",
                letterSpacing: "-0.01em", marginTop: 2,
              }}
            >
              {loading && <span className="spinner" />}
              {loading
                ? (isSignin ? "Entrando…" : "Creando cuenta…")
                : (isSignin ? "Iniciar sesión" : "Crear cuenta")}
            </button>
          </form>
        </div>

        <p style={{ fontSize: 12, color: "var(--text-3)", textAlign: "center", marginTop: 18, lineHeight: 1.6 }}>
          Transcripción en vivo · Active recall · Resumen y mapa mental con IA
        </p>
      </main>
      </div>
    </div>
  );
}
