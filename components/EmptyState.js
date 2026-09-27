import Link from "next/link";
import { IconBadge } from "./Icon";

// Estado vacío común: insignia con icono + título + texto + acción opcional.
export default function EmptyState({ icon, color = "var(--accent)", title, text, action, compact = false, bare = false }) {
  const body = (
    <>
      <IconBadge name={icon} color={color} size={compact ? 44 : 56} style={{ margin: "0 auto 14px" }} />
      {title && <p style={{ fontWeight: 600, fontSize: compact ? 14 : 15, color: "var(--text)", marginBottom: 6 }}>{title}</p>}
      {text && <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.6, maxWidth: 380, margin: "0 auto" }}>{text}</p>}
      {action && (
        <Link href={action.href} style={{ textDecoration: "none", display: "inline-block", marginTop: 18 }}>
          <span className="btn-accent" style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "var(--accent)", color: "white", borderRadius: "var(--radius-btn)", padding: "9px 18px", fontWeight: 600, fontSize: 13 }}>
            {action.label}
          </span>
        </Link>
      )}
    </>
  );

  if (bare) return <div style={{ textAlign: "center", padding: compact ? "24px 12px" : "40px 16px" }}>{body}</div>;

  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-card)", padding: compact ? "28px 20px" : "48px 24px", textAlign: "center" }}>
      {body}
    </div>
  );
}
