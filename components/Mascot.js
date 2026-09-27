import Image from "next/image";

// Poses disponibles en /public/mascot (recortadas de MASCOTA.png).
export const MASCOT_POSES = [
  "hola", "menu", "amor", "procesando", "musica",
  "tu-puedes", "logro", "notificacion", "enfoque", "descanso",
  "cargando", "completado", "calendario", "biblioteca", "perfil",
  "despedida", "ayuda", "idea", "dormido", "celebrando",
];

const ALT = {
  hola: "Mascota de VibeLearning saludando",
  idea: "Mascota de VibeLearning con una idea",
  procesando: "Mascota de VibeLearning procesando",
  "tu-puedes": "Mascota de VibeLearning estudiando",
  logro: "Mascota de VibeLearning celebrando con una estrella",
  ayuda: "Mascota de VibeLearning pensando",
  cargando: "Mascota de VibeLearning descansando mientras carga",
  completado: "Mascota de VibeLearning celebrando",
  descanso: "Mascota de VibeLearning tomando un descanso",
  enfoque: "Mascota de VibeLearning concentrada",
};

// La mascota con un halo suave detrás (se integra en fondo claro y oscuro).
export default function Mascot({ pose = "hola", size = 140, halo = true, priority = false, float = false, style, alt }) {
  return (
    <div
      className={float ? "mascot-float" : undefined}
      style={{ position: "relative", width: size, height: size, flexShrink: 0, ...style }}
    >
      {halo && <div aria-hidden="true" style={{ position: "absolute", inset: "-8%", background: "var(--mascot-halo)", borderRadius: "50%" }} />}
      <Image
        src={`/mascot/${pose}.png`}
        alt={alt ?? ALT[pose] ?? "Mascota de VibeLearning"}
        fill
        sizes={`${size}px`}
        priority={priority}
        style={{ objectFit: "contain" }}
      />
    </div>
  );
}
