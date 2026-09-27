import Image from "next/image";

// Avatar del usuario: la mascota dentro de un círculo con degradado (como en UI.png).
export default function Avatar({ size = 32, ring = false }) {
  return (
    <span
      aria-hidden="true"
      style={{
        position: "relative", width: size, height: size, borderRadius: "50%", flexShrink: 0, overflow: "hidden",
        background: "linear-gradient(135deg, #DCE3FF, #E9DEFF)",
        boxShadow: ring ? "0 0 0 3px var(--card), 0 0 0 5px rgba(124,108,248,0.55)" : "none",
        display: "inline-block",
      }}
    >
      <Image src="/mascot/hola.png" alt="" fill sizes={`${size}px`} style={{ objectFit: "cover", objectPosition: "50% 18%", transform: "scale(1.25) translateY(8%)" }} />
    </span>
  );
}
