"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Mascot from "@/components/Mascot";

const IN_PROGRESS_TITLE = "Clase en progreso...";

export default function NewClass() {
  const router = useRouter();
  const [error, setError] = useState("");

  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    async function createAndRedirect() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push("/login"); return; }

        // Limpia clases que se abrieron pero nunca se finalizaron (solo se guardan al finalizar).
        const staleBefore = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
        await supabase.from("classes").delete()
          .eq("user_id", user.id)
          .eq("title", IN_PROGRESS_TITLE)
          .lt("created_at", staleBefore);

        const { data: cls, error: err } = await supabase
          .from("classes")
          .insert({ user_id: user.id, title: IN_PROGRESS_TITLE, data: {} })
          .select()
          .single();

        if (err || !cls?.id) throw err || new Error("No se recibió el id de la clase");
        router.push(`/class/${cls.id}/live`);
      } catch (err) {
        console.error("[new-class] error creando clase:", err);
        setError("No se pudo crear la clase. Revisa tu conexión o la configuración de Supabase.");
      }
    }
    createAndRedirect();
  }, [router, attempt]);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      {error ? (
        <div className="fade-up" role="alert" style={{ maxWidth: 380, width: "100%", textAlign: "center", background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-card)", padding: "32px 28px" }}>
          <Mascot pose="ayuda" size={130} style={{ margin: "0 auto 10px" }} />
          <p style={{ fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>Algo salió mal</p>
          <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.6, marginBottom: 20 }}>{error}</p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <Link href="/dashboard" className="btn-ghost" style={{ textDecoration: "none", color: "var(--text-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-btn)", padding: "9px 16px", fontSize: 13, fontWeight: 500 }}>
              Volver
            </Link>
            <button type="button" onClick={() => { setError(""); setAttempt(a => a + 1); }} className="btn-accent" style={{ background: "var(--accent)", color: "white", border: "none", borderRadius: "var(--radius-btn)", padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              Reintentar
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, color: "var(--text-2)", fontSize: 14 }}>
          <Mascot pose="grabando" size={150} float priority />
          <span style={{ display: "inline-flex", alignItems: "center", gap: 10, fontWeight: 600 }}>
            <span className="spinner" style={{ borderColor: "var(--border-strong)", borderTopColor: "var(--accent)" }} />
            Preparando tu clase…
          </span>
        </div>
      )}
    </div>
  );
}
