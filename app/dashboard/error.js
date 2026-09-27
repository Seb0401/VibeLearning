"use client";
import { useEffect } from "react";
import Mascot from "@/components/Mascot";
import Button from "@/components/Button";

// Error inesperado dentro del dashboard: permite reintentar sin perder la navegación.
export default function DashboardError({ error, reset }) {
  useEffect(() => { console.error("[dashboard]", error); }, [error]);
  return (
    <div style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ textAlign: "center", maxWidth: 420 }}>
        <Mascot pose="ayuda" size={150} style={{ margin: "0 auto 16px" }} />
        <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--text)" }}>Algo salió mal</h1>
        <p style={{ fontSize: 14, color: "var(--text-2)", marginTop: 8, lineHeight: 1.6 }}>
          No pudimos cargar esta sección. Revisa tu conexión e inténtalo de nuevo.
        </p>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 20 }}>
          <Button variant="ghost" href="/dashboard" icon="home">Inicio</Button>
          <Button onClick={() => reset()} icon="repeat">Reintentar</Button>
        </div>
      </div>
    </div>
  );
}
