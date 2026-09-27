"use client";

// Estilos y animaciones de la clase en vivo.
export default function LiveStyles() {
  return (
    <>
    <style>{`
      @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      @keyframes scoreFlash {
        0%   { opacity: 0; transform: translate(-50%,-60%) scale(0.8); }
        20%  { opacity: 1; transform: translate(-50%,-50%) scale(1.05); }
        70%  { opacity: 1; transform: translate(-50%,-50%) scale(1); }
        100% { opacity: 0; transform: translate(-50%,-40%) scale(0.95); }
      }
      @keyframes shrinkBar {
        from { width: 100%; }
        to   { width: 0%; }
      }
      /* ── Source buttons (mic = blue, cam = purple) ── */
      .live-src-btn {
        position: relative;
        width: 78px;
        height: 78px;
        border-radius: 50%;
        color: white;
        display: grid;
        place-items: center;
        cursor: pointer;
        z-index: 2;
        transition: transform 160ms ease, box-shadow 160ms ease, filter 160ms ease;
      }
      .live-src-btn:hover  { transform: translateY(-1px) scale(1.03); }
      .live-src-btn:active { transform: scale(0.96); }

      /* Blue — mic */
      .live-src-btn--mic {
        border: 1px solid rgba(96,165,250,0.48);
        background:
          radial-gradient(circle at 34% 28%, rgba(255,255,255,0.32), transparent 27%),
          linear-gradient(135deg, #3b82f6 0%, #60A5FA 52%, #5b8def 100%);
        box-shadow: 0 18px 44px rgba(59,130,246,0.36), inset 0 1px 0 rgba(255,255,255,0.22);
      }
      .live-src-btn--mic:hover {
        box-shadow: 0 22px 54px rgba(59,130,246,0.46), inset 0 1px 0 rgba(255,255,255,0.26);
      }
      .live-src-btn--mic.is-recording {
        border-color: rgba(248,113,113,0.55);
        background:
          radial-gradient(circle at 34% 28%, rgba(255,255,255,0.28), transparent 27%),
          linear-gradient(135deg, #ef4444 0%, #fb7185 56%, #f97316 100%);
        box-shadow: 0 18px 48px rgba(239,68,68,0.34), inset 0 1px 0 rgba(255,255,255,0.2);
        animation: micBreath 1.2s ease-in-out infinite;
      }
      .live-src-btn--mic.is-expanded:not(.is-recording) {
        border-color: rgba(96,165,250,0.75);
        box-shadow: 0 18px 44px rgba(59,130,246,0.48), 0 0 0 5px rgba(96,165,250,0.12), inset 0 1px 0 rgba(255,255,255,0.22);
      }

      /* Purple — camera */
      .live-src-btn--cam {
        border: 1px solid rgba(167,139,250,0.48);
        background:
          radial-gradient(circle at 34% 28%, rgba(255,255,255,0.32), transparent 27%),
          linear-gradient(135deg, #7C6CF8 0%, #A78BFA 52%, #9b8cff 100%);
        box-shadow: 0 18px 44px rgba(124,108,248,0.36), inset 0 1px 0 rgba(255,255,255,0.22);
      }
      .live-src-btn--cam:hover {
        box-shadow: 0 22px 54px rgba(124,108,248,0.46), inset 0 1px 0 rgba(255,255,255,0.26);
      }
      .live-src-btn--cam.is-expanded {
        border-color: rgba(167,139,250,0.75);
        box-shadow: 0 18px 44px rgba(124,108,248,0.5), 0 0 0 5px rgba(167,139,250,0.12), inset 0 1px 0 rgba(255,255,255,0.22);
      }
      .mic-ring {
        position: absolute;
        width: 82px;
        height: 82px;
        border: 1px solid rgba(248,113,113,0.38);
        border-radius: 50%;
        animation: micWave 1.65s ease-out infinite;
      }
      .mic-ring-two {
        animation-delay: 0.55s;
      }
      .mic-orbit {
        position: absolute;
        width: 102px;
        height: 102px;
        border-radius: 50%;
        border: 1px dashed rgba(248,113,113,0.28);
        animation: micSpin 8s linear infinite;
      }
      .mic-level {
        width: 4px;
        height: 7px;
        border-radius: 99px;
        background: #f87171;
        box-shadow: 0 0 12px rgba(248,113,113,0.55);
        animation: micLevel 680ms ease-in-out infinite alternate;
      }
      @keyframes micWave {
        0% { opacity: 0.72; transform: scale(0.86); }
        100% { opacity: 0; transform: scale(1.42); }
      }
      @keyframes micBreath {
        0%, 100% { filter: brightness(1); }
        50% { filter: brightness(1.12); }
      }
      @keyframes micSpin {
        to { transform: rotate(360deg); }
      }
      @keyframes micLevel {
        0% { height: 6px; opacity: 0.5; }
        45% { height: 18px; opacity: 1; }
        100% { height: 10px; opacity: 0.75; }
      }
    `}</style>
    </>
  );
}
