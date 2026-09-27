import Link from "next/link";
import { IconBadge } from "./Icon";
import Mascot from "./Mascot";

// Estado vacío común: mascota (o icono) + título + texto + acción opcional.
export default function EmptyState({ icon, mascot, color = "var(--accent)", title, text, action, compact = false, bare = false }) {
  const body = (
    <>
      {mascot ? (
        <Mascot pose={mascot} size={compact ? 110 : 150} style={{ margin: "0 auto 14px" }} />
      ) : (
        <IconBadge name={icon} color={color} size={compact ? 44 : 56} style={{ margin: "0 auto 14px" }} />
      )}
      {title && <p style={{ fontWeight: 700, fontSize: compact ? 14 : 16, color: "var(--text)", marginBottom: 6 }}>{title}</p>}
      {text && <p style={{ fontSize: 13.5, color: "var(--text-2)", lineHeight: 1.6, maxWidth: 400, margin: "0 auto" }}>{text}</p>}
      {action && (
        <Link href={action.href} className="ui-btn ui-btn--primary ui-btn--md" style={{ marginTop: 18 }}>
          {action.label}
        </Link>
      )}
    </>
  );

  if (bare) return <div style={{ textAlign: "center", padding: compact ? "24px 12px" : "40px 16px" }}>{body}</div>;

  return (
    <div className="ui-card" style={{ padding: compact ? "28px 20px" : "40px 24px", textAlign: "center" }}>
      {body}
    </div>
  );
}
