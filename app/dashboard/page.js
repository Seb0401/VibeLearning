import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import Card from "@/components/Card";
import Button from "@/components/Button";

export default async function Dashboard() {
  const supabase = await createClient();
  const { data: classes } = await supabase
    .from("classes")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem 1rem" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "2rem",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text)" }}>
          Mis clases
        </h1>
        <Link href="/class/new">
          <Button>+ Nueva clase</Button>
        </Link>
      </div>

      {!classes || classes.length === 0 ? (
        <Card>
          <p style={{ color: "var(--text-muted)", textAlign: "center" }}>
            Aún no tienes clases guardadas. ¡Empieza una nueva!
          </p>
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {classes.map((c) => (
            <Link key={c.id} href={`/class/${c.id}`} style={{ textDecoration: "none" }}>
              <Card className="hover-card">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontWeight: 600, color: "var(--text)" }}>
                    {c.title}
                  </span>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    {new Date(c.created_at).toLocaleDateString("es-MX", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
