import Mascot from "@/components/Mascot";

// Se muestra mientras cargan las páginas del dashboard (Server Components).
export default function DashboardLoading() {
  return (
    <div style={{ minHeight: "70vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
      <Mascot pose="cargando" size={130} float priority />
      <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-2)" }}>Un momento…</p>
    </div>
  );
}
