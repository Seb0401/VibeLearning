import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import Card from "@/components/Card";
import Button from "@/components/Button";
import MindMap from "@/components/MindMap";
import ReactMarkdown from "react-markdown";

export default async function ClassPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: cls } = await supabase
    .from("classes")
    .select("*")
    .eq("id", id)
    .single();

  if (!cls) notFound();

  const { transcript, final_summary, final_mindmap } = cls.data ?? {};

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem 1rem" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <Link href="/dashboard">
          <Button variant="ghost">← Dashboard</Button>
        </Link>
      </div>

      <h1 style={{ fontSize: "1.6rem", fontWeight: 700, marginBottom: "1.5rem", color: "var(--text)" }}>
        {cls.title}
      </h1>

      {final_summary && (
        <Card style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ fontWeight: 600, marginBottom: "1rem", color: "var(--accent)" }}>
            Resumen high-yield
          </h2>
          <div style={{ color: "var(--text)", lineHeight: 1.7 }}>
            <ReactMarkdown>{final_summary}</ReactMarkdown>
          </div>
        </Card>
      )}

      {final_mindmap && (
        <Card style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ fontWeight: 600, marginBottom: "1rem", color: "var(--accent)" }}>
            Mapa mental
          </h2>
          <MindMap markdown={final_mindmap} />
        </Card>
      )}

      {transcript && (
        <Card>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.75rem",
            }}
          >
            <h2 style={{ fontWeight: 600, color: "var(--accent)" }}>Transcripción</h2>
            <a
              href={`data:text/plain;charset=utf-8,${encodeURIComponent(transcript)}`}
              download={`${cls.title}.txt`}
            >
              <Button variant="ghost">Descargar .txt</Button>
            </a>
          </div>
          <p
            style={{
              color: "var(--text-muted)",
              fontSize: "0.85rem",
              lineHeight: 1.6,
              maxHeight: "200px",
              overflowY: "auto",
            }}
          >
            {transcript}
          </p>
        </Card>
      )}
    </div>
  );
}
