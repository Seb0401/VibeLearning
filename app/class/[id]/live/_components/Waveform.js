"use client";
import { useEffect, useRef } from "react";

const BARS = 44;

// Onda de audio en vivo: barras simétricas que siguen el nivel real del micrófono.
// Sin stream (o en pausa) muestra una línea tranquila.
export default function Waveform({ stream, active, height = 84 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    let raf = 0;
    let audioCtx = null;
    let analyser = null;
    let data = null;
    const levels = new Array(BARS).fill(0.06);

    if (stream && active && stream.getAudioTracks().length) {
      try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioCtx.createMediaStreamSource(stream);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.75;
        source.connect(analyser);
        data = new Uint8Array(analyser.frequencyBinCount);
      } catch {
        analyser = null;
      }
    }

    function draw() {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      // Sin tamaño todavía (oculto o en transición): esperar al siguiente cuadro
      if (w < BARS * 4 || h <= 0) { raf = requestAnimationFrame(draw); return; }
      if (canvas.width !== w * dpr) { canvas.width = w * dpr; canvas.height = h * dpr; }
      ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx2d.clearRect(0, 0, w, h);

      if (analyser) {
        analyser.getByteFrequencyData(data);
        const usable = Math.floor(data.length * 0.7);
        for (let i = 0; i < BARS; i++) {
          // de afuera hacia el centro: las frecuencias graves quedan al medio
          const idx = Math.floor((Math.abs(i - BARS / 2) / (BARS / 2)) * usable);
          const v = (data[usable - 1 - idx] || 0) / 255;
          levels[i] += (Math.max(0.06, Math.min(1, v * 1.8)) - levels[i]) * 0.35;
        }
      } else {
        for (let i = 0; i < BARS; i++) levels[i] += (0.06 - levels[i]) * 0.2;
      }

      const gap = 3;
      const barW = (w - gap * (BARS - 1)) / BARS;
      const grad = ctx2d.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, "#5B7CFF");
      grad.addColorStop(0.5, "#A855F7");
      grad.addColorStop(1, "#5B7CFF");
      ctx2d.fillStyle = grad;
      for (let i = 0; i < BARS; i++) {
        const bh = Math.max(4, levels[i] * h);
        const x = i * (barW + gap);
        const y = (h - bh) / 2;
        const r = Math.max(0, Math.min(barW / 2, 3));
        ctx2d.beginPath();
        ctx2d.roundRect ? ctx2d.roundRect(x, y, barW, bh, r) : ctx2d.rect(x, y, barW, bh);
        ctx2d.fill();
      }
      raf = requestAnimationFrame(draw);
    }
    draw();

    return () => {
      cancelAnimationFrame(raf);
      audioCtx?.close().catch(() => {});
    };
  }, [stream, active]);

  return <canvas ref={canvasRef} aria-hidden="true" style={{ width: "100%", height, display: "block" }} />;
}
