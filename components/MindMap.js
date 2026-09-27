"use client";
import { useEffect, useRef, useId } from "react";
import Icon from "./Icon";
import { stripEmoji } from "@/lib/text";

const PALETTE = ["#8B7FFF", "#7C6CF8", "#A78BFA", "#C4B5FD", "#DDD6FE"];

function colorForDepth(depth) {
  return PALETTE[Math.min(depth, PALETTE.length - 1)];
}

function ToolbarBtn({ children, onClick, title }) {
  return (
    <button
      onClick={onClick}
      aria-label={title}
      title={title}
      style={{
        width: 26, height: 26, borderRadius: 7, border: "1px solid var(--border)",
        background: "rgba(23,23,33,0.85)", color: "var(--text-2)", fontSize: 14,
        fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center",
        justifyContent: "center", lineHeight: 1, backdropFilter: "blur(6px)",
      }}
    >
      {children}
    </button>
  );
}

export default function MindMap({ markdown }) {
  const ref = useRef(null);
  const mmRef = useRef(null);
  const rawId = useId().replace(/:/g, "");
  const svgId = `mm-${rawId}`;

  useEffect(() => {
    if (!markdown || !ref.current) return;
    let cancelled = false;
    (async () => {
      const { Transformer } = await import("markmap-lib");
      const { Markmap } = await import("markmap-view");
      if (cancelled || !ref.current) return;
      ref.current.innerHTML = "";
      ref.current.id = svgId;
      const { root } = new Transformer().transform(stripEmoji(markdown));
      const mm = Markmap.create(
        ref.current,
        {
          id: svgId,
          duration: 400,
          maxInitialScale: 1.4,
          fitRatio: 0.9,
          paddingX: 26,
          spacingHorizontal: 70,
          spacingVertical: 14,
          nodeMinHeight: 20,
          color: (node) => colorForDepth(node.state.depth),
          lineWidth: (node) => Math.max(4 - node.state.depth, 1.25),
          style: (id) => `
            #${id} { background: radial-gradient(circle at 28% 22%, rgba(124,108,248,0.10), transparent 55%); }
            #${id} .markmap-foreign { color: var(--text-2); font: 400 13px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
            #${id} [data-depth="0"] > .markmap-foreign { color: var(--text); font-weight: 700; font-size: 15px; }
            #${id} [data-depth="1"] > .markmap-foreign { color: var(--text); font-weight: 600; }
            #${id} .markmap-node > circle { stroke-width: 2px; }
            #${id} [data-depth="0"] > circle { r: 7px; filter: drop-shadow(0 0 8px rgba(124,108,248,0.7)); }
            #${id} [data-depth="1"] > circle { filter: drop-shadow(0 0 4px rgba(124,108,248,0.35)); }
            #${id} .markmap-link { stroke-opacity: 0.55; }
          `,
        },
        root
      );
      mmRef.current = mm;
    })();
    return () => {
      cancelled = true;
      mmRef.current?.destroy();
      mmRef.current = null;
    };
  }, [markdown, svgId]);

  function zoom(factor) {
    mmRef.current?.rescale(factor);
  }

  function fit() {
    mmRef.current?.fit();
  }

  function exportSVG() {
    // Los nodos de markmap usan <foreignObject> para el texto, lo que "tiñe" cualquier
    // canvas donde se dibuje esta imagen (restricción de seguridad del navegador, incluso
    // con blob URLs locales) — por eso se exporta como SVG vectorial en vez de PNG.
    const svgEl = ref.current;
    if (!svgEl) return;
    const rect = svgEl.getBoundingClientRect();
    const clone = svgEl.cloneNode(true);
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("width", rect.width);
    clone.setAttribute("height", rect.height);
    const bgRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    bgRect.setAttribute("width", "100%");
    bgRect.setAttribute("height", "100%");
    bgRect.setAttribute("fill", "#0B0B12");
    clone.insertBefore(bgRect, clone.firstChild);

    const svgStr = new XMLSerializer().serializeToString(clone);
    const url = URL.createObjectURL(new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "mapa-mental.svg";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", minHeight: 200 }}>
      <svg ref={ref} style={{ width: "100%", height: "100%", display: "block" }} />
      <div style={{ position: "absolute", bottom: 10, right: 10, display: "flex", gap: 4 }}>
        <ToolbarBtn onClick={() => zoom(1.25)} title="Acercar"><Icon name="plus" size={14} /></ToolbarBtn>
        <ToolbarBtn onClick={() => zoom(0.8)} title="Alejar"><Icon name="minus" size={14} /></ToolbarBtn>
        <ToolbarBtn onClick={fit} title="Ajustar a la vista"><Icon name="maximize" size={13} /></ToolbarBtn>
        <ToolbarBtn onClick={exportSVG} title="Descargar como SVG"><Icon name="download" size={13} /></ToolbarBtn>
      </div>
    </div>
  );
}
