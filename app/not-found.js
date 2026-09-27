import Mascot from "@/components/Mascot";
import Button from "@/components/Button";

export default function NotFound() {
  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "var(--bg)" }}>
      <div style={{ textAlign: "center", maxWidth: 420 }}>
        <Mascot pose="ayuda" size={180} float priority style={{ margin: "0 auto 18px" }} />
        <p style={{ fontSize: 13, fontWeight: 800, color: "var(--accent)", letterSpacing: "0.08em" }}>ERROR 404</p>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text)", marginTop: 6 }}>No encontramos esta página</h1>
        <p style={{ fontSize: 14, color: "var(--text-2)", marginTop: 8, lineHeight: 1.6 }}>
          Puede que la clase se haya eliminado o que el enlace esté incompleto.
        </p>
        <Button href="/dashboard" icon="home" size="lg" style={{ marginTop: 22 }}>Volver al inicio</Button>
      </div>
    </main>
  );
}
