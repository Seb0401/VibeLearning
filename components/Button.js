export default function Button({
  children,
  onClick,
  variant = "primary",
  disabled = false,
  type = "button",
  className = "",
}) {
  const base = {
    borderRadius: "var(--radius)",
    padding: "0.6rem 1.25rem",
    fontWeight: 600,
    fontSize: "0.9rem",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    border: "none",
    transition: "opacity 0.15s",
  };
  const variants = {
    primary: { background: "var(--accent)", color: "#fff" },
    danger: { background: "var(--error)", color: "#fff" },
    ghost: {
      background: "transparent",
      color: "var(--text)",
      border: "1px solid var(--border)",
    },
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={className}
      style={{ ...base, ...variants[variant] }}
    >
      {children}
    </button>
  );
}
