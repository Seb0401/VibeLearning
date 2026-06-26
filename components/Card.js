export default function Card({ children, className = "" }) {
  return (
    <div
      className={className}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "1.25rem",
      }}
    >
      {children}
    </div>
  );
}
