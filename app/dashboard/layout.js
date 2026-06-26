import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/Sidebar";

export default async function DashboardLayout({ children }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const userName = user?.email?.split("@")[0] || "Alumno";

  return (
    <div style={{ display: "flex", flex: 1, minHeight: "100vh" }}>
      <Sidebar userName={userName} />
      <main style={{ flex: 1, overflow: "auto", background: "var(--bg)" }}>
        {children}
      </main>
    </div>
  );
}
