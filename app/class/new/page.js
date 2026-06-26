"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function NewClass() {
  const router = useRouter();

  useEffect(() => {
    async function createAndRedirect() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: cls, error } = await supabase
        .from("classes")
        .insert({ user_id: user.id, title: "Clase en progreso...", data: {} })
        .select()
        .single();

      if (error || !cls?.id) {
        console.error("[new-class] error creando clase:", error);
        return;
      }

      router.push(`/class/${cls.id}/live`);
    }
    createAndRedirect();
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: "0.9rem" }}>
      Iniciando clase…
    </div>
  );
}
