"use client";
import AppIcon from "@/components/Icon";
import Waveform from "./Waveform";
import { formatTimer } from "./shared";

const SOURCES = [
  { key: "mic",    icon: "mic",     label: "Micrófono" },
  { key: "system", icon: "monitor", label: "Pantalla" },
  { key: "both",   icon: "shuffle", label: "Mic + Pantalla" },
];
const VISUAL = [
  { key: "screenshot", icon: "monitor", label: "Captura" },
  { key: "upload",     icon: "upload",  label: "Subir" },
  { key: "camera",     icon: "camera",  label: "Cámara" },
];

function fmtLong(s) {
  const h = Math.floor(s / 3600);
  return h > 0 ? `${String(h).padStart(2, "0")}:${formatTimer(s % 3600)}` : `00:${formatTimer(s)}`;
}

// Tarjeta de grabación al estilo de la nueva UI: onda de audio, cronómetro grande y
// botones redondos Pausar / Detener / Marcar.
export default function RecorderCard({
  recording, paused, elapsed, audioSource, audioStream, analyzeLoading, markers,
  onSelectSource, onStart, onPause, onResume, onStop, onMark, onVisual,
}) {
  return (
    <section className="rec-card" aria-label="Grabación de la clase">
      {!recording ? (
        <>
          <div className="rec-card__row">
            <p className="rec-card__title">Grabar clase</p>
            <div role="radiogroup" aria-label="Fuente de audio" className="rec-seg">
              {SOURCES.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  role="radio"
                  aria-checked={audioSource === s.key}
                  className={`rec-seg__opt${audioSource === s.key ? " is-active" : ""}`}
                  onClick={() => onSelectSource(s.key)}
                >
                  <AppIcon name={s.icon} size={13} /> {s.label}
                </button>
              ))}
            </div>
          </div>
          <div className="rec-card__idle">
            <Waveform active={false} height={56} />
            <button type="button" className="rec-main" onClick={onStart} aria-label="Comenzar a grabar">
              <AppIcon name="mic" size={30} strokeWidth={2.2} />
            </button>
            <p className="rec-card__hint">Pulsa para comenzar a grabar</p>
          </div>
        </>
      ) : (
        <>
          <Waveform stream={audioStream} active={!paused} height={72} />
          <div className="rec-timer" aria-live="off">{fmtLong(elapsed)}</div>
          <p className={`rec-status${paused ? " is-paused" : ""}`}>
            <span className="rec-status__dot" /> {paused ? "En pausa" : "Grabando…"}
            {markers > 0 && <span className="rec-status__marks">· {markers} {markers === 1 ? "marcador" : "marcadores"}</span>}
          </p>
          <div className="rec-controls">
            <div className="rec-control">
              <button type="button" className="rec-round" onClick={paused ? onResume : onPause} aria-label={paused ? "Reanudar" : "Pausar"}>
                <AppIcon name={paused ? "play" : "pause"} size={22} strokeWidth={2.2} />
              </button>
              <span>{paused ? "Reanudar" : "Pausar"}</span>
            </div>
            <div className="rec-control">
              <button type="button" className="rec-round rec-round--stop" onClick={onStop} aria-label="Detener grabación">
                <span className="rec-stop-square" />
              </button>
              <span>Detener</span>
            </div>
            <div className="rec-control">
              <button type="button" className="rec-round" onClick={onMark} aria-label="Marcar este momento">
                <AppIcon name="bookmark" size={21} strokeWidth={2.2} />
              </button>
              <span>Marcar</span>
            </div>
          </div>
        </>
      )}

      <div className="rec-visual">
        <span className="rec-visual__label"><AppIcon name="image" size={13} /> {analyzeLoading ? "Analizando imagen…" : "Agregar imagen de la clase"}</span>
        <div style={{ display: "flex", gap: 6 }}>
          {VISUAL.map((v) => (
            <button key={v.key} type="button" className="rec-visual__btn" onClick={() => onVisual(v.key)} disabled={analyzeLoading} title={v.label}>
              <AppIcon name={v.icon} size={14} /> <span>{v.label}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
