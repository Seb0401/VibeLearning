"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/* ── CSS injected once ────────────────────────────────────────────────── */
const CSS = `
  @keyframes cc-menu {
    from { opacity:0; transform:translateY(-8px) scale(.96); }
    to   { opacity:1; transform:translateY(0)    scale(1);   }
  }
  @keyframes cc-confirm {
    from { opacity:0; transform:translateX(10px); }
    to   { opacity:1; transform:translateX(0);    }
  }
  @keyframes cc-input {
    from { opacity:0; transform:translateX(-6px); }
    to   { opacity:1; transform:translateX(0);    }
  }

  .cc {
    transition:
      transform 200ms ease,
      border-color 200ms ease,
      background 220ms ease,
      box-shadow 220ms ease;
  }
  .cc:hover {
    transform: translateY(-1px);
    border-color: rgba(255,255,255,.11) !important;
  }
  .cc:hover .cc-bar   { opacity: 1 !important; }
  .cc:hover .cc-dots  { opacity: 1; }
  .cc:hover .cc-arrow { opacity: .7 !important; transform: translateX(3px); }

  .cc-bar   { transition: opacity 220ms; }
  .cc-icon  { transition: box-shadow 220ms ease, transform 200ms ease; }
  .cc:hover .cc-icon { transform: scale(1.05); }

  .cc-dots  { opacity:0; transition: opacity 140ms, background 120ms; }
  .cc-dots:hover { background: rgba(255,255,255,.08) !important; }
  .cc-arrow { opacity:.2; transition: opacity 200ms, transform 200ms; }

  .cc-menu-pop { animation: cc-menu 130ms cubic-bezier(.16,1,.3,1) both; }

  .cc-mi {
    display:flex; align-items:center; gap:9px;
    width:100%; padding:9px 14px; border:none; background:none;
    font-size:13px; font-weight:500; text-align:left; cursor:pointer;
    transition: background 100ms;
  }
  .cc-mi:hover        { background: rgba(255,255,255,.06); }
  .cc-mi-del          { color:#EF4444 !important; }
  .cc-mi-del:hover    { background: rgba(239,68,68,.09) !important; }

  .cc-confirm-row { animation: cc-confirm 150ms ease both; }
  .cc-input-row   { animation: cc-input   120ms ease both; }

  .cc-tag { transition: background 130ms, border-color 130ms, color 130ms; }

  .cc-btn {
    display:inline-flex; align-items:center; justify-content:center; gap:5px;
    border:none; border-radius:7px; font-size:12px; font-weight:600;
    padding:5px 12px; cursor:pointer; transition: opacity 150ms, background 150ms;
  }
  .cc-btn:disabled { opacity:.5; cursor:not-allowed; }
  .cc-btn-accent { background:var(--accent); color:#fff; }
  .cc-btn-accent:hover:not(:disabled) { opacity:.85; }
  .cc-btn-ghost  { background:rgba(255,255,255,.07); color:var(--text-2); }
  .cc-btn-ghost:hover:not(:disabled)  { background:rgba(255,255,255,.11); }
  .cc-btn-danger { background:rgba(239,68,68,.15); color:#EF4444; }
  .cc-btn-danger:hover:not(:disabled) { background:rgba(239,68,68,.25); }

  .cc-input {
    flex:1; min-width:0;
    background:rgba(255,255,255,.05);
    border:1px solid var(--accent);
    border-radius:7px; padding:5px 10px;
    font-size:14px; font-weight:600; color:var(--text); outline:none;
    transition: box-shadow 150ms;
  }
  .cc-input:focus { box-shadow: 0 0 0 3px rgba(124,108,248,.2); }
`;

/* ── Icons ────────────────────────────────────────────────────────────── */
function Icon({ size = 16, children }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}
const IcoMoreV  = ({ s }) => <Icon size={s}><circle cx="12" cy="5"  r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></Icon>;
const IcoPencil = ({ s }) => <Icon size={s}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></Icon>;
const IcoTrash  = ({ s }) => <Icon size={s}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></Icon>;
const IcoCheck  = ({ s }) => <Icon size={s}><polyline points="20 6 9 17 4 12"/></Icon>;
const IcoX      = ({ s }) => <Icon size={s}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></Icon>;
const IcoChev   = ({ s }) => <Icon size={s}><polyline points="9 18 15 12 9 6"/></Icon>;
const IcoSpark  = ({ s }) => <Icon size={s}><path d="m12 3-1.9 5.8a2 2 0 0 1-1.287 1.288L3 12l5.8 1.9a2 2 0 0 1 1.288 1.287L12 21l1.9-5.8a2 2 0 0 1 1.287-1.288L21 12l-5.8-1.9a2 2 0 0 1-1.288-1.287Z"/></Icon>;
const IcoDB     = ({ s }) => <Icon size={s}><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></Icon>;
const IcoCode   = ({ s }) => <Icon size={s}><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></Icon>;
const IcoBook   = ({ s }) => <Icon size={s}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></Icon>;
const IcoZap    = ({ s }) => <Icon size={s}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></Icon>;
const IcoLayers = ({ s }) => <Icon size={s}><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></Icon>;

/* ── Subject ──────────────────────────────────────────────────────────── */
function getSubject(title, idx) {
  const t = (title || "").toLowerCase();
  if (t.match(/machine.?learn|neural|deep.?learn|\bml\b|\bia\b|intelig|ai/))
    return { icon: <IcoSpark s={17} />, bg: "rgba(96,165,250,.13)",  color: "#60A5FA" };
  if (t.match(/cálculo|calculo|ecuaci|integr|derivad|serie|álgebra|algebra|matem/))
    return { icon: <span style={{ fontSize:15, fontWeight:700, lineHeight:1 }}>∑</span>, bg: "rgba(167,139,250,.13)", color: "#A78BFA" };
  if (t.match(/base.*dato|sql|database|datos|normaliz/))
    return { icon: <IcoDB s={17} />,     bg: "rgba(34,197,94,.13)",  color: "#22C55E" };
  if (t.match(/program|código|codigo|oop|objeto|herencia|polimorf/))
    return { icon: <IcoCode s={17} />,   bg: "rgba(251,191,36,.13)", color: "#FBBF24" };
  const POOL = [
    { icon: <IcoBook   s={17} />, bg: "rgba(96,165,250,.13)",  color: "#60A5FA"  },
    { icon: <IcoSpark  s={17} />, bg: "rgba(167,139,250,.13)", color: "#A78BFA"  },
    { icon: <IcoLayers s={17} />, bg: "rgba(34,197,94,.13)",   color: "#22C55E"  },
    { icon: <IcoZap    s={17} />, bg: "rgba(251,191,36,.13)",  color: "#FBBF24"  },
  ];
  return POOL[idx % POOL.length];
}

/* ── Helpers ──────────────────────────────────────────────────────────── */
function fmtDate(str) {
  const d = new Date(str);
  return {
    date: d.toLocaleDateString("es-MX", { day: "numeric", month: "short" }),
    time: d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false }),
  };
}
function estimateDuration(t) {
  if (!t) return null;
  const m = Math.round(t.trim().split(/\s+/).filter(Boolean).length / 130);
  return m >= 1 ? `${m} min` : null;
}
function Dot() {
  return <span style={{ width: 3, height: 3, borderRadius: "50%", background: "currentColor", opacity: .3, flexShrink: 0 }} />;
}

/* ── ClassCard ────────────────────────────────────────────────────────── */
export default function ClassCard({ c, idx }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [title, setTitle]       = useState(c.title);
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy]         = useState(false);
  const [hovered, setHovered]   = useState(false);
  const menuRef  = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const h = e => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [menuOpen]);

  useEffect(() => { if (renaming) inputRef.current?.focus(); }, [renaming]);

  async function doRename(e) {
    e?.preventDefault();
    const t = title.trim();
    if (!t || t === c.title) { cancelRename(); return; }
    setBusy(true);
    await createClient().from("classes").update({ title: t }).eq("id", c.id);
    setBusy(false);
    setRenaming(false);
    router.refresh();
  }
  function cancelRename() { setTitle(c.title); setRenaming(false); }

  async function doDelete() {
    setBusy(true);
    await createClient().from("classes").delete().eq("id", c.id);
    router.refresh();
  }

  function onCardClick() {
    if (renaming || deleting || menuOpen) return;
    router.push(`/class/${c.id}`);
  }

  const { date, time } = fmtDate(c.created_at);
  const dur      = estimateDuration(c.data?.transcript);
  const concepts = c.data?.concepts || [];
  const tags     = concepts.map(x => (typeof x === "string" ? x : x.name)).filter(Boolean);
  const hasPDF   = !!c.data?.material_summary;
  const subj     = getSubject(c.title, idx);

  const isHov = hovered && !deleting;

  return (
    <>
      <style>{CSS}</style>

      <div
        className="cc"
        onClick={onCardClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position: "relative",
          background: deleting
            ? "rgba(239,68,68,.04)"
            : isHov
              ? `linear-gradient(135deg, #1d1d2a 0%, ${subj.color}0B 100%)`
              : "var(--card)",
          border: deleting ? "1px solid rgba(239,68,68,.28)" : "1px solid var(--border)",
          borderRadius: "var(--radius-card)",
          padding: "16px 18px",
          display: "flex", gap: 13, alignItems: "stretch",
          cursor: renaming || deleting ? "default" : "pointer",
          userSelect: "none",
          zIndex: menuOpen ? 10 : "auto",
          boxShadow: isHov
            ? `0 1px 0 rgba(255,255,255,.05) inset, 0 12px 40px rgba(0,0,0,.38), 0 0 0 1px ${subj.color}28, 0 0 48px ${subj.color}0D`
            : "none",
        }}
      >

        {/* Gradient left bar */}
        <div
          className="cc-bar"
          style={{
            width: 3, borderRadius: 99, flexShrink: 0,
            background: deleting
              ? "#EF4444"
              : `linear-gradient(180deg, ${subj.color} 0%, ${subj.color}30 100%)`,
            opacity: deleting ? .7 : .45,
            transition: "background 300ms, opacity 220ms",
          }}
        />

        {/* Subject icon with hover glow */}
        <div
          className="cc-icon"
          style={{
            width: 42, height: 42, borderRadius: 11, flexShrink: 0, alignSelf: "center",
            background: subj.bg, color: subj.color,
            display: "flex", alignItems: "center", justifyContent: "center",
            position: "relative",
            boxShadow: isHov ? `0 0 0 1px ${subj.color}30, 0 0 20px ${subj.color}28` : "none",
          }}
        >
          {subj.icon}
          {hasPDF && (
            <span style={{
              position: "absolute", bottom: -4, right: -4,
              background: "#EF4444", color: "#fff",
              fontSize: 8, fontWeight: 700, letterSpacing: ".04em",
              borderRadius: 4, padding: "1px 4px",
              border: "1.5px solid #0B0B12",
            }}>PDF</span>
          )}
        </div>

        {/* Body */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>

          {/* Row 1: title + completada pill + ⋮ */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>

            {renaming ? (
              <form
                className="cc-input-row"
                onSubmit={doRename}
                onClick={e => e.stopPropagation()}
                style={{ flex: 1, display: "flex", gap: 7, alignItems: "center" }}
              >
                <input
                  ref={inputRef}
                  className="cc-input"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  onKeyDown={e => e.key === "Escape" && cancelRename()}
                  disabled={busy}
                />
                <button type="submit" disabled={busy} className="cc-btn cc-btn-accent"
                  style={{ width: 30, height: 30, padding: 0 }}>
                  <IcoCheck s={13} />
                </button>
                <button type="button" disabled={busy} onClick={cancelRename}
                  className="cc-btn cc-btn-ghost" style={{ width: 30, height: 30, padding: 0 }}>
                  <IcoX s={13} />
                </button>
              </form>
            ) : (
              <h3 style={{
                flex: 1, minWidth: 0, margin: 0,
                fontSize: 14, fontWeight: 600, color: "var(--text)",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {c.title}
              </h3>
            )}

            {/* Completada pill */}
            {!renaming && !deleting && (
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                fontSize: 11, fontWeight: 600, color: "#22C55E",
                background: "rgba(34,197,94,.09)",
                border: "1px solid rgba(34,197,94,.18)",
                borderRadius: 99, padding: "3px 9px", flexShrink: 0,
                letterSpacing: ".01em",
              }}>
                <span style={{
                  width: 5, height: 5, borderRadius: "50%",
                  background: "#22C55E",
                  boxShadow: "0 0 7px #22C55E",
                  flexShrink: 0,
                }} />
                Completada
              </span>
            )}

            {/* ⋮ menu */}
            {!renaming && (
              <div
                ref={menuRef}
                style={{ position: "relative", flexShrink: 0 }}
                onClick={e => e.stopPropagation()}
              >
                <button
                  className="cc-dots"
                  onClick={() => setMenuOpen(o => !o)}
                  style={{
                    background: menuOpen ? "rgba(255,255,255,.08)" : "none",
                    border: "none", borderRadius: 7, cursor: "pointer",
                    width: 28, height: 28, color: "var(--text-2)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  <IcoMoreV s={15} />
                </button>

                {menuOpen && (
                  <div
                    className="cc-menu-pop"
                    style={{
                      position: "absolute", right: 0, top: "calc(100% + 6px)",
                      background: "#1a1a26",
                      border: "1px solid rgba(255,255,255,.09)",
                      borderRadius: 10, overflow: "hidden",
                      boxShadow: "0 20px 48px rgba(0,0,0,.55), 0 1px 0 rgba(255,255,255,.05) inset",
                      zIndex: 100, minWidth: 152,
                    }}
                  >
                    <button className="cc-mi" style={{ color: "var(--text)" }}
                      onClick={() => { setRenaming(true); setMenuOpen(false); }}>
                      <IcoPencil s={13} /> Renombrar
                    </button>
                    <div style={{ height: 1, background: "rgba(255,255,255,.06)", margin: "0 8px" }} />
                    <button className="cc-mi cc-mi-del"
                      onClick={() => { setDeleting(true); setMenuOpen(false); }}>
                      <IcoTrash s={13} /> Eliminar
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Row 2: meta */}
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "var(--text-3)", lineHeight: 1 }}>
            <span>{date}</span>
            <Dot />
            <span>{time}</span>
            {dur && <><Dot /><span>{dur}</span></>}
            {concepts.length > 0 && <><Dot /><span>{concepts.length} conceptos</span></>}
          </div>

          {/* Row 3: tags OR delete confirm */}
          {deleting ? (
            <div
              className="cc-confirm-row"
              onClick={e => e.stopPropagation()}
              style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 4 }}
            >
              <span style={{ fontSize: 12, color: "#EF4444", fontWeight: 500 }}>
                ¿Eliminar esta clase?
              </span>
              <button onClick={doDelete} disabled={busy} className="cc-btn cc-btn-danger">
                {busy ? "…" : "Eliminar"}
              </button>
              <button onClick={() => setDeleting(false)} disabled={busy} className="cc-btn cc-btn-ghost">
                Cancelar
              </button>
            </div>
          ) : tags.length > 0 && (
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", paddingTop: 2 }}>
              {tags.slice(0, 4).map((tag, i) => (
                <span key={i} className="cc-tag" style={{
                  background: i === 0 ? `${subj.color}12` : "rgba(255,255,255,.04)",
                  border: `1px solid ${i === 0 ? subj.color + "28" : "rgba(255,255,255,.07)"}`,
                  color: i === 0 ? subj.color : "var(--text-3)",
                  fontSize: 11, fontWeight: i === 0 ? 600 : 500,
                  borderRadius: 99, padding: "2px 9px",
                  maxWidth: 128, overflow: "hidden",
                  textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>{tag}</span>
              ))}
              {tags.length > 4 && (
                <span style={{ fontSize: 11, color: "var(--text-3)", alignSelf: "center" }}>
                  +{tags.length - 4}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right arrow */}
        {!renaming && !deleting && (
          <div className="cc-arrow" style={{ alignSelf: "center", flexShrink: 0, color: "var(--text-3)", lineHeight: 0 }}>
            <IcoChev s={15} />
          </div>
        )}
      </div>
    </>
  );
}
