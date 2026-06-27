"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.7 33.3 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C33.9 6.7 29.2 5 24 5 13 5 4 14 4 24s9 19 20 19c10 0 19-7 19-19 0-1.3-.2-2.7-.4-4z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.8 19 13 24 13c3 0 5.7 1.1 7.8 2.9l5.7-5.7C33.9 6.7 29.2 5 24 5c-7.7 0-14.4 4.1-17.7 9.7z"/>
      <path fill="#4CAF50" d="M24 43c5.2 0 9.9-1.7 13.5-4.6l-6.2-5.2C29.4 34.8 26.8 36 24 36c-5.3 0-9.7-2.7-11.3-7H6.3l-6.6 4.8C3.6 39 13.3 43 24 43z"/>
      <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2c4-3.7 6.6-9.2 6.6-15.8 0-1.3-.2-2.7-.4-4z"/>
    </svg>
  );
}

export default function LoginPage() {
  const supabase = createClient();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode]         = useState("signin");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || location.origin}/auth/callback` },
    });
  }

  async function handleEmail(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error: err } = mode === "signin"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (err) setError(err.message);
    else window.location.href = "/dashboard";
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--bg)",
      padding: "1rem",
      position: "relative",
      overflow: "hidden",
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

      {/* Card */}
      <div style={{
        position: "relative", zIndex: 1,
        width: "100%", maxWidth: 400,
        background: "rgba(23,23,33,0.90)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 24,
        padding: "40px 36px",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        boxShadow: "0 40px 100px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)",
      }}>

        {/* Logo + title */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 32 }}>
          <div style={{
            width: 54, height: 54, borderRadius: 16,
            background: "linear-gradient(135deg, #7C6CF8 0%, #A78BFA 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 8px 28px rgba(124,108,248,0.45)",
            marginBottom: 16,
          }}>
            <svg width="27" height="27" viewBox="0 0 24 24" fill="white">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
            </svg>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.03em", marginBottom: 6 }}>
            VibeLearning
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-3)", textAlign: "center", lineHeight: 1.5 }}>
            {mode === "signin" ? "Bienvenido de nuevo 👋" : "Crea tu cuenta gratis ✨"}
          </p>
        </div>

        {/* Google */}
        <button
          onClick={handleGoogle}
          style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            padding: "11px 16px",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: 12, color: "var(--text)", fontSize: 14, fontWeight: 500,
            cursor: "pointer", marginBottom: 20,
            transition: "background 150ms, border-color 150ms",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.09)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.16)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)"; }}
        >
          <GoogleIcon />
          Continuar con Google
        </button>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
          <span style={{ fontSize: 12, color: "var(--text-3)", flexShrink: 0, letterSpacing: "0.03em" }}>
            o con tu email
          </span>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
        </div>

        {/* Form */}
        <form onSubmit={handleEmail} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text-3)", marginBottom: 7, letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Correo electrónico
            </label>
            <input
              value={email}
              onChange={e => setEmail(e.target.value)}
              type="email"
              placeholder="tu@email.com"
              required
              style={{
                width: "100%", background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.09)",
                borderRadius: 12, padding: "11px 14px",
                color: "var(--text)", fontSize: 14, outline: "none",
                transition: "border-color 150ms, box-shadow 150ms",
              }}
              onFocus={e => { e.target.style.borderColor = "rgba(124,108,248,0.55)"; e.target.style.boxShadow = "0 0 0 3px rgba(124,108,248,0.12)"; }}
              onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.09)"; e.target.style.boxShadow = "none"; }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text-3)", marginBottom: 7, letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Contraseña
            </label>
            <input
              value={password}
              onChange={e => setPassword(e.target.value)}
              type="password"
              placeholder="••••••••"
              required
              style={{
                width: "100%", background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.09)",
                borderRadius: 12, padding: "11px 14px",
                color: "var(--text)", fontSize: 14, outline: "none",
                transition: "border-color 150ms, box-shadow 150ms",
              }}
              onFocus={e => { e.target.style.borderColor = "rgba(124,108,248,0.55)"; e.target.style.boxShadow = "0 0 0 3px rgba(124,108,248,0.12)"; }}
              onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.09)"; e.target.style.boxShadow = "none"; }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%", padding: "13px",
              background: loading
                ? "rgba(124,108,248,0.45)"
                : "linear-gradient(135deg, #7C6CF8 0%, #A78BFA 100%)",
              border: "none", borderRadius: 12,
              color: "white", fontSize: 15, fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: loading ? "none" : "0 8px 28px rgba(124,108,248,0.35)",
              transition: "opacity 150ms, box-shadow 150ms, transform 100ms",
              letterSpacing: "-0.01em", marginTop: 2,
            }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.boxShadow = "0 10px 36px rgba(124,108,248,0.48)"; }}
            onMouseLeave={e => { if (!loading) e.currentTarget.style.boxShadow = "0 8px 28px rgba(124,108,248,0.35)"; }}
            onMouseDown={e => { if (!loading) e.currentTarget.style.transform = "scale(0.98)"; }}
            onMouseUp={e => { e.currentTarget.style.transform = ""; }}
          >
            {loading ? "Cargando..." : mode === "signin" ? "Iniciar sesión" : "Crear cuenta"}
          </button>
        </form>

        {/* Error */}
        {error && (
          <div style={{
            marginTop: 14, padding: "10px 14px",
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.22)",
            borderRadius: 10, color: "#F87171", fontSize: 13, lineHeight: 1.5,
          }}>
            {error}
          </div>
        )}

        {/* Toggle mode */}
        <button
          onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); }}
          style={{
            display: "block", width: "100%", marginTop: 22,
            textAlign: "center", background: "none", border: "none",
            color: "var(--text-3)", fontSize: 13, cursor: "pointer", padding: 0,
            transition: "color 150ms",
          }}
          onMouseEnter={e => e.currentTarget.style.color = "var(--text-2)"}
          onMouseLeave={e => e.currentTarget.style.color = "var(--text-3)"}
        >
          {mode === "signin"
            ? <span>¿No tienes cuenta?{" "}<span style={{ color: "var(--accent)", fontWeight: 600 }}>Crear una gratis</span></span>
            : <span>¿Ya tienes cuenta?{" "}<span style={{ color: "var(--accent)", fontWeight: 600 }}>Iniciar sesión</span></span>
          }
        </button>
      </div>
    </div>
  );
}
