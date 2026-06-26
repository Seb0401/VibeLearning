"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/Button";
import Card from "@/components/Card";

export default function LoginPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("signin");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
  }

  async function handleEmail(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) setError(error.message);
    else window.location.href = "/dashboard";
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
    >
      <Card style={{ width: "100%", maxWidth: "400px" }}>
        <h1
          style={{
            fontSize: "1.5rem",
            fontWeight: 700,
            marginBottom: "1.5rem",
            color: "var(--text)",
          }}
        >
          VibeLearning
        </h1>

        <Button variant="ghost" onClick={handleGoogle} className="w-full" style={{ width: "100%", marginBottom: "1rem" }}>
          Continuar con Google
        </Button>

        <div
          style={{
            textAlign: "center",
            color: "var(--text-muted)",
            margin: "1rem 0",
            fontSize: "0.85rem",
          }}
        >
          o
        </div>

        <form onSubmit={handleEmail} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="correo"
            required
            style={{
              background: "var(--bg)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              padding: "0.6rem 0.9rem",
              color: "var(--text)",
              fontSize: "0.9rem",
            }}
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="contraseña"
            required
            style={{
              background: "var(--bg)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              padding: "0.6rem 0.9rem",
              color: "var(--text)",
              fontSize: "0.9rem",
            }}
          />
          <Button type="submit" disabled={loading}>
            {loading ? "..." : mode === "signin" ? "Entrar" : "Crear cuenta"}
          </Button>
        </form>

        {error && (
          <p style={{ color: "var(--error)", fontSize: "0.85rem", marginTop: "0.75rem" }}>
            {error}
          </p>
        )}

        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          style={{
            background: "none",
            border: "none",
            color: "var(--accent)",
            cursor: "pointer",
            fontSize: "0.85rem",
            marginTop: "1rem",
            padding: 0,
          }}
        >
          {mode === "signin" ? "¿No tienes cuenta? Crear una" : "¿Ya tienes cuenta? Entrar"}
        </button>
      </Card>
    </div>
  );
}
