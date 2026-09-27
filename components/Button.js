import Link from "next/link";
import Icon from "./Icon";

// Botón compartido. Con `href` se renderiza como enlace (sin anidar <button> dentro de <a>).
//   variant: "primary" | "ghost" | "soft" | "danger"
//   size:    "sm" | "md" | "lg"
//   icon / iconRight: nombre de un icono de components/Icon.js
export default function Button({
  children,
  href,
  variant = "primary",
  size = "md",
  icon,
  iconRight,
  block = false,
  loading = false,
  className = "",
  type = "button",
  ...rest
}) {
  const cls = `ui-btn ui-btn--${variant} ui-btn--${size}${block ? " ui-btn--block" : ""}${className ? ` ${className}` : ""}`;
  const iconSize = size === "sm" ? 13 : size === "lg" ? 17 : 15;
  const content = (
    <>
      {loading ? <span className="spinner" style={{ width: iconSize, height: iconSize }} /> : icon && <Icon name={icon} size={iconSize} />}
      {children}
      {iconRight && <Icon name={iconRight} size={iconSize} />}
    </>
  );

  if (href) {
    return <Link href={href} className={cls} {...rest}>{content}</Link>;
  }
  return (
    <button type={type} className={cls} disabled={loading || rest.disabled} {...rest}>
      {content}
    </button>
  );
}
