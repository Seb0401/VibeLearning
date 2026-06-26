"use client";
import { useEffect, useRef } from "react";

export default function MindMap({ markdown }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!markdown || !ref.current) return;
    let mm;
    (async () => {
      const { Transformer } = await import("markmap-lib");
      const { Markmap } = await import("markmap-view");
      ref.current.innerHTML = "";
      const { root } = new Transformer().transform(markdown);
      mm = Markmap.create(ref.current, undefined, root);
    })();
    return () => mm?.destroy();
  }, [markdown]);

  return <svg ref={ref} style={{ width: "100%", height: "100%", minHeight: "200px", display: "block" }} />;
}
