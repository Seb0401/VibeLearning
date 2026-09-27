import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/Sidebar";

export default async function DashboardLayout({ children }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const userName = user?.email?.split("@")[0] || "Alumno";

  return (
    <div className="app-shell">
      <Sidebar userName={userName} userEmail={user?.email} sidebarPages={user?.user_metadata?.sidebar_pages} />
      <main className="app-main">
        {children}
      </main>
    </div>
  );
}
