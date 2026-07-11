"use client";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

const PRESETS = [
  { label: "Clásico",  name: "25 / 5 min",  work: 25*60, short: 5*60,  long: 15*60, sessions: 4 },
  { label: "Largo",    name: "50 / 10 min",  work: 50*60, short: 10*60, long: 20*60, sessions: 4 },
  { label: "Profundo", name: "90 / 20 min",  work: 90*60, short: 20*60, long: 30*60, sessions: 2 },
];

const PHASE_COLOR = { work: "#7C6CF8", short: "#22C55E", long: "#60A5FA" };
const PHASE_LABEL = { work: "Enfoque", short: "Descanso corto", long: "Descanso largo" };

function Ring({ pct, color, size = 240 }) {
  const r    = size / 2 - 14;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={10}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={10}
        strokeLinecap="round"
        strokeDasharray={String(circ)}
        strokeDashoffset={circ * (1 - Math.max(0, Math.min(1, pct)))}
        style={{ transition: "stroke-dashoffset 0.9s linear, stroke 0.4s ease" }}
      />
    </svg>
  );
}

export default function PomodoroPage() {
  const [pi,        setPi]        = useState(0);
  const [phase,     setPhase]     = useState("work");
  const [session,   setSession]   = useState(1);
  const [secs,      setSecs]      = useState(PRESETS[0].work);
  const [running,   setRunning]   = useState(false);
  const [todaySess, setTodaySess] = useState(0);
  const [concept,   setConcept]   = useState(null);

  const intervalRef = useRef(null);
  const sb = useRef(null);
  if (!sb.current) sb.current = createClient();

  const P     = PRESETS[pi];
  const total = phase === "work" ? P.work : phase === "short" ? P.short : P.long;
  const pct   = (total - secs) / total;
  const color = PHASE_COLOR[phase];
  const mm    = String(Math.floor(secs / 60)).padStart(2, "0");
  const ss    = String(secs % 60).padStart(2, "0");

  function beep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const g   = ctx.createGain();
      osc.connect(g); g.connect(ctx.destination);
      osc.frequency.value = 880;
      g.gain.setValueAtTime(0.3, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      osc.start(); osc.stop(ctx.currentTime + 0.8);
    } catch {}
  }

  async function loadConcept() {
    const { data } = await sb.current.from("classes")
      .select("title,data").order("created_at", { ascending: false }).limit(10);
    const pool = (data || []).filter(c => c.data?.concepts?.length > 0);
    if (!pool.length) return;
    const cls = pool[Math.floor(Math.random() * pool.length)];
    const arr = cls.data.concepts;
    const c   = arr[Math.floor(Math.random() * arr.length)];
    setConcept({ cls: cls.title, name: c.name || c, summary: c.summary || "" });
  }

  function doAdvance(curPhase, curSession, curPi) {
    const Pr = PRESETS[curPi];
    beep();
    if (curPhase === "work") {
      const toLong = curSession % Pr.sessions === 0;
      const next   = toLong ? "long" : "short";
      setPhase(next);
      setSecs(toLong ? Pr.long : Pr.short);
      setTodaySess(t => t + 1);
      loadConcept();
    } else {
      const nextSes = curPhase === "long" ? 1 : curSession + 1;
      setPhase("work");
      setSession(nextSes);
      setSecs(Pr.work);
      setConcept(null);
    }
    setRunning(false);
  }

  useEffect(() => {
    clearInterval(intervalRef.current);
    if (!running) return;

    const capPhase   = phase;
    const capSession = session;
    const capPi      = pi;
    let s = secs;

    intervalRef.current = setInterval(() => {
      s -= 1;
      setSecs(s);
      if (s <= 0) {
        clearInterval(intervalRef.current);
        doAdvance(capPhase, capSession, capPi);
      }
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [running]); // eslint-disable-line react-hooks/exhaustive-deps

  function reset() {
    clearInterval(intervalRef.current);
    setPhase("work"); setSession(1); setSecs(P.work); setRunning(false); setConcept(null);
  }

  function skip() {
    clearInterval(intervalRef.current);
    doAdvance(phase, session, pi);
  }

  function switchPreset(i) {
    clearInterval(intervalRef.current);
    setPi(i); setPhase("work"); setSession(1); setSecs(PRESETS[i].work); setRunning(false); setConcept(null);
  }

  return (
    <div style={{ padding: "40px 48px", display: "flex", flexDirection: "column", gap: 28, height: "calc(100vh - 1px)", boxSizing: "border-box" }}>

      {/* Header */}
      <div style={{ flexShrink: 0 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em" }}>Pomodoro</h1>
        <p style={{ fontSize: 14, color: "var(--text-2)", marginTop: 6 }}>
          Técnica de bloques de enfoque para estudiar sin distraerte
        </p>
      </div>

      {/* Main 2-column */}
      <div style={{ display: "flex", gap: 20, flex: 1, minHeight: 0 }}>

        {/* Left: Timer */}
        <div style={{
          flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", gap: 28,
          background: "var(--card)", border: "1px solid var(--border)",
          borderRadius: "var(--radius-card)",
        }}>

          {/* Phase label */}
          <div style={{
            background: `${color}18`, border: `1px solid ${color}30`,
            borderRadius: 99, padding: "6px 18px",
          }}>
            <span style={{ fontSize: 12, fontWeight: 700, color, letterSpacing: "0.06em", textTransform: "uppercase" }}>
              {PHASE_LABEL[phase]}
            </span>
          </div>

          {/* Ring + time */}
          <div style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <Ring pct={pct} color={color} size={240} />
            <div style={{ position: "absolute", textAlign: "center" }}>
              <div style={{ fontSize: 56, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.04em", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
                {mm}:{ss}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 6 }}>
                Sesión {session} · Ciclo {pi === 2 ? "2" : "4"} bloques
              </div>
            </div>
          </div>

          {/* Session dots */}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {Array.from({ length: P.sessions }).map((_, i) => (
              <div key={i} style={{
                width: 10, height: 10, borderRadius: "50%",
                background: i < session ? color : "rgba(255,255,255,0.08)",
                boxShadow: i < session ? `0 0 8px ${color}80` : "none",
                transition: "all 300ms ease",
              }}/>
            ))}
          </div>

          {/* Controls */}
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <button onClick={reset} style={{
              background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)",
              borderRadius: 11, padding: "10px 20px", color: "var(--text-2)",
              fontSize: 13, fontWeight: 500, cursor: "pointer",
            }}>
              Reiniciar
            </button>
            <button onClick={() => setRunning(r => !r)} style={{
              background: color, border: "none", borderRadius: 14,
              padding: "14px 48px", color: "white", fontSize: 16, fontWeight: 700,
              cursor: "pointer", boxShadow: `0 4px 24px ${color}50`,
              transition: "transform 100ms, opacity 100ms",
            }}>
              {running ? "Pausar" : "Iniciar"}
            </button>
            <button onClick={skip} style={{
              background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)",
              borderRadius: 11, padding: "10px 20px", color: "var(--text-2)",
              fontSize: 13, fontWeight: 500, cursor: "pointer",
            }}>
              Saltar
            </button>
          </div>

          {/* Break concept */}
          {concept && (
            <div style={{
              background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)",
              borderRadius: 14, padding: "16px 28px", maxWidth: 420, textAlign: "center",
            }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#22C55E", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
                Concepto del descanso · {concept.cls}
              </p>
              <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", marginBottom: concept.summary ? 6 : 0 }}>
                {concept.name}
              </p>
              {concept.summary && (
                <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.65 }}>
                  {concept.summary}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Right panel */}
        <div style={{ width: 272, flexShrink: 0, display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Preset */}
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-card)", padding: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 12 }}>
              Duración
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {PRESETS.map((p, i) => (
                <button key={p.name} onClick={() => switchPreset(i)} style={{
                  background: pi === i ? "var(--accent-dim)" : "rgba(255,255,255,0.02)",
                  border: `1px solid ${pi === i ? "rgba(124,108,248,0.3)" : "var(--border)"}`,
                  borderRadius: 10, padding: "11px 14px",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  cursor: "pointer", transition: "all 150ms",
                }}>
                  <span style={{ fontSize: 13, fontWeight: pi === i ? 600 : 400, color: pi === i ? "var(--accent)" : "var(--text)" }}>
                    {p.label}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--text-3)" }}>{p.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-card)", padding: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 16 }}>
              Hoy
            </p>
            {[
              { label: "Sesiones completadas", value: todaySess },
              { label: "Min. de enfoque", value: todaySess * Math.round(P.work / 60) },
              { label: "Sesión actual", value: `${session} / ${P.sessions}` },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 13, color: "var(--text-2)" }}>{label}</span>
                <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>{value}</span>
              </div>
            ))}
          </div>

          {/* Tip */}
          <div style={{ background: "rgba(124,108,248,0.06)", border: "1px solid rgba(124,108,248,0.15)", borderRadius: "var(--radius-card)", padding: "16px 18px" }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: "var(--accent)", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 8 }}>
              Tip
            </p>
            <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.65 }}>
              Durante el descanso, aléjate de la pantalla. Camina, toma agua, estira. Tu cerebro consolida lo aprendido mientras descansa.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
