import { useId } from "react";

// Marca de VibeLearning: "V" con destellos + texto "vibelearning" (learning en degradado).
//   size:    alto del símbolo en px
//   variant: "full" (símbolo + texto) | "mark" (solo símbolo)
export function LogoMark({ size = 32 }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id={`${id}-l`} x1="8" y1="14" x2="24" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7C5CFF" />
          <stop offset="1" stopColor="#5B4BEA" />
        </linearGradient>
        <linearGradient id={`${id}-r`} x1="40" y1="12" x2="24" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4F8BFF" />
          <stop offset="1" stopColor="#5B6CF5" />
        </linearGradient>
      </defs>
      {/* destellos */}
      <path d="M16.5 9.5 14 5" stroke="#7C5CFF" strokeWidth="3" strokeLinecap="round" />
      <path d="M24 7.5V3" stroke="#6D6BFA" strokeWidth="3" strokeLinecap="round" />
      <path d="M31.5 9.5 34 5" stroke="#4F8BFF" strokeWidth="3" strokeLinecap="round" />
      {/* V */}
      <path d="M8.5 15.5c2.6-1.5 5.8-.6 7.2 2L25.6 36c1.5 2.8.4 6.3-2.4 7.7-2.8 1.5-6.3.4-7.7-2.4L6.2 23c-1.4-2.7-.4-6 2.3-7.5Z" fill={`url(#${id}-l)`} />
      <path d="M39.6 14.2c2.8 1.3 4 4.7 2.6 7.5L32.4 41.4c-1.4 2.8-4.8 4-7.6 2.6-2.8-1.4-4-4.8-2.6-7.6L32 16.8c1.4-2.8 4.8-3.9 7.6-2.6Z" fill={`url(#${id}-r)`} />
    </svg>
  );
}

export default function Logo({ size = 30, variant = "full", textSize }) {
  const fs = textSize || Math.round(size * 0.62);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: Math.round(size * 0.28) }}>
      <LogoMark size={size} />
      {variant === "full" && (
        <span style={{ fontWeight: 800, fontSize: fs, letterSpacing: "-0.03em", lineHeight: 1, color: "var(--text)" }}>
          vibe<span className="text-grad">learning</span>
        </span>
      )}
    </span>
  );
}
