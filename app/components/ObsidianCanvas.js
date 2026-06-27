"use client";
import React, { useState, useEffect, useRef } from "react";

export default function ObsidianCanvas({ nodes }) {
  const [zoom, setZoom] = useState(0.85);
  const [pan, setPan] = useState({ x: 50, y: 50 });
  const [nodePositions, setNodePositions] = useState({});
  const [draggedNodeId, setDraggedNodeId] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [imageErrors, setImageErrors] = useState({});

  const viewportRef = useRef(null);

  // Lógica de gradientes fallback por ID para que sean consistentes
  const getGradientFallback = (id) => {
    const gradients = [
      "linear-gradient(135deg, #7C6CF8 0%, #60A5FA 100%)",
      "linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%)",
      "linear-gradient(135deg, #10B981 0%, #059669 100%)",
      "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
      "linear-gradient(135deg, #EF4444 0%, #C084FC 100%)",
    ];
    const index = parseInt(id.replace(/\D/g, "") || "0") % gradients.length;
    return gradients[index];
  };

  // Inicializar posiciones de los nodos en círculo equidistante
  useEffect(() => {
    if (!nodes || nodes.length === 0) return;
    const initialPositions = {};
    const radius = 220; // Radio del círculo de nodos
    const centerX = 320;
    const centerY = 240;

    nodes.forEach((node, idx) => {
      const angle = (idx / nodes.length) * 2 * Math.PI;
      initialPositions[node.id] = {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      };
    });
    setNodePositions(initialPositions);
    setSelectedNodeId(nodes[0]?.id || null); // Seleccionar el primero por defecto
  }, [nodes]);

  // Manejar zoom con la rueda del ratón
  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = 1.08;
    let newZoom = zoom;
    if (e.deltaY < 0) {
      newZoom = Math.min(zoom * zoomFactor, 2.0);
    } else {
      newZoom = Math.max(zoom / zoomFactor, 0.4);
    }

    const rect = viewportRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Calcular el nuevo paneo para hacer zoom hacia el puntero
    const newPanX = mouseX - ((mouseX - pan.x) * newZoom) / zoom;
    const newPanY = mouseY - ((mouseY - pan.y) * newZoom) / zoom;

    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  };

  // Iniciar paneo de fondo
  const handleMouseDown = (e) => {
    if (e.target === viewportRef.current || e.target.classList.contains("canvas-bg")) {
      setIsPanning(true);
      setPanStart({
        x: e.clientX - pan.x,
        y: e.clientY - pan.y,
      });
    }
  };

  // Iniciar arrastre de un nodo
  const handleNodeMouseDown = (nodeId, e) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedNodeId(nodeId);

    const clientX = e.clientX;
    const clientY = e.clientY;

    const pos = nodePositions[nodeId] || { x: 0, y: 0 };
    const canvasX = (clientX - pan.x) / zoom;
    const canvasY = (clientY - pan.y) / zoom;

    setDraggedNodeId(nodeId);
    setDragOffset({
      x: canvasX - pos.x,
      y: canvasY - pos.y,
    });
  };

  // Movimiento del cursor (tanto para paneo como para mover nodos)
  const handleMouseMove = (e) => {
    if (draggedNodeId && nodePositions[draggedNodeId]) {
      const clientX = e.clientX;
      const clientY = e.clientY;

      const canvasX = (clientX - pan.x) / zoom;
      const canvasY = (clientY - pan.y) / zoom;

      setNodePositions((prev) => ({
        ...prev,
        [draggedNodeId]: {
          x: canvasX - dragOffset.x,
          y: canvasY - dragOffset.y,
        },
      }));
    } else if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }
  };

  // Finalizar acciones al soltar el ratón
  const handleMouseUp = () => {
    setDraggedNodeId(null);
    setIsPanning(false);
  };

  // Renderizar conexiones (Líneas SVG entre nodos conectados)
  const renderConnections = () => {
    const renderedLines = [];
    const seenConnections = new Set();

    nodes.forEach((node) => {
      const pos1 = nodePositions[node.id];
      if (!pos1) return;

      const connections = node.connections || [];
      connections.forEach((connId) => {
        const pos2 = nodePositions[connId];
        if (!pos2) return;

        // Clave única para evitar duplicar la línea bidireccional
        const key = [node.id, connId].sort().join("-");
        if (seenConnections.has(key)) return;
        seenConnections.add(key);

        // Centro de los nodos (Asumiendo que el nodo tiene un ancho de 160px y alto de 80px)
        const x1 = pos1.x + 80;
        const y1 = pos1.y + 40;
        const x2 = pos2.x + 80;
        const y2 = pos2.y + 40;

        renderedLines.push(
          <line
            key={key}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#7C6CF8"
            strokeWidth="2"
            strokeOpacity="0.45"
            strokeDasharray="5,5"
          />
        );
      });
    });

    return renderedLines;
  };

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  return (
    <div
      style={{
        display: "flex",
        height: "550px",
        background: "#080811",
        borderRadius: "14px",
        border: "1px solid var(--border)",
        overflow: "hidden",
        position: "relative",
        userSelect: "none",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {/* Canvas Viewport */}
      <div
        ref={viewportRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="canvas-bg"
        style={{
          flex: 1,
          position: "relative",
          overflow: "hidden",
          cursor: isPanning ? "grabbing" : draggedNodeId ? "grabbing" : "grab",
          backgroundColor: "#080811",
          backgroundImage: "radial-gradient(rgba(255, 255, 255, 0.15) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
      >
        {/* Contenedor Transformado de Nodos y Conexiones */}
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "0 0",
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: "none",
          }}
        >
          {/* Capa de Conexiones SVG */}
          <svg
            style={{
              position: "absolute",
              width: "3000px",
              height: "2000px",
              left: "-1000px",
              top: "-1000px",
              transform: "translate(1000px, 1000px)",
              pointerEvents: "none",
            }}
          >
            {renderConnections()}
          </svg>

          {/* Capa de Nodos HTML */}
          {nodes.map((node) => {
            const pos = nodePositions[node.id] || { x: 100, y: 100 };
            const isSelected = node.id === selectedNodeId;

            return (
              <div
                key={node.id}
                onMouseDown={(e) => handleNodeMouseDown(node.id, e)}
                style={{
                  position: "absolute",
                  left: pos.x,
                  top: pos.y,
                  width: "160px",
                  background: "#121225",
                  border: isSelected ? "2px solid #7C6CF8" : "1px solid var(--border)",
                  borderRadius: "10px",
                  padding: "10px",
                  boxShadow: isSelected
                    ? "0 0 16px rgba(124, 108, 248, 0.6)"
                    : "0 4px 14px rgba(0,0,0,0.4)",
                  cursor: "grab",
                  pointerEvents: "auto",
                  transition: "border-color 0.2s, box-shadow 0.2s",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                {/* ID / Tag */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span
                    style={{
                      background: "rgba(124, 108, 248, 0.15)",
                      color: "#A78BFA",
                      fontSize: "9px",
                      fontWeight: "700",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      textTransform: "uppercase",
                    }}
                  >
                    {node.id}
                  </span>
                  {/* Pequeña bombilla/punto de conexión */}
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#7C6CF8" }} />
                </div>

                {/* Título Nodo */}
                <h3
                  style={{
                    color: "white",
                    fontSize: "12px",
                    fontWeight: "600",
                    margin: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {node.label}
                </h3>

                {/* Pequeño texto */}
                <p
                  style={{
                    color: "#9CA3AF",
                    fontSize: "9px",
                    lineHeight: "1.3",
                    margin: 0,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {node.summary}
                </p>
              </div>
            );
          })}
        </div>

        {/* Indicadores de Control del Canvas (Esquina inferior izquierda) */}
        <div
          style={{
            position: "absolute",
            bottom: "12px",
            left: "12px",
            background: "rgba(18, 18, 35, 0.8)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "6px 10px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "11px",
            color: "var(--text-3)",
            backdropFilter: "blur(6px)",
            zIndex: 5,
          }}
        >
          <span>Zoom: {Math.round(zoom * 100)}%</span>
          <div style={{ width: 1, height: 12, background: "var(--border)" }} />
          <span>Arrastra para mover • Scroll para Zoom</span>
        </div>
      </div>

      {/* Panel de Detalles Lateral (Obsidian-style Side Drawer) */}
      {selectedNode && (
        <div
          style={{
            width: "300px",
            background: "#0c0c1b",
            borderLeft: "1px solid var(--border)",
            display: "flex",
            flexDirection: "column",
            zIndex: 10,
            position: "relative",
            animation: "slideIn 0.25s ease-out",
          }}
        >
          {/* Header del Panel */}
          <div
            style={{
              padding: "14px 16px",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexShrink: 0,
            }}
          >
            <div>
              <span style={{ fontSize: "10px", fontWeight: "700", color: "#A78BFA", textTransform: "uppercase" }}>
                Detalles del Concepto
              </span>
              <h2 style={{ fontSize: "15px", fontWeight: "700", color: "white", margin: "2px 0 0" }}>
                {selectedNode.label}
              </h2>
            </div>
            <button
              onClick={() => setSelectedNodeId(null)}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-3)",
                fontSize: "18px",
                cursor: "pointer",
                padding: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              &times;
            </button>
          </div>

          {/* Contenido Desplazable del Panel */}
          <div style={{ padding: "16px", flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "14px" }}>
            {/* Imagen del Concepto (Unsplash Source con Fallback a Degradado) */}
            <div
              style={{
                width: "100%",
                height: "140px",
                borderRadius: "8px",
                overflow: "hidden",
                position: "relative",
                background: getGradientFallback(selectedNode.id),
              }}
            >
              {!imageErrors[selectedNode.id] && (
                <img
                  src={`https://source.unsplash.com/268x140/?${encodeURIComponent(selectedNode.image_query || selectedNode.label)}`}
                  alt={selectedNode.label}
                  onError={() => {
                    setImageErrors((prev) => ({ ...prev, [selectedNode.id]: true }));
                  }}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    transition: "opacity 0.3s",
                  }}
                />
              )}
              {/* Overlay sutil sobre la imagen */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "linear-gradient(to top, rgba(12, 12, 27, 0.85) 0%, transparent 100%)",
                }}
              />
              <span
                style={{
                  position: "absolute",
                  bottom: "10px",
                  left: "10px",
                  fontSize: "10px",
                  color: "#D1D5DB",
                  background: "rgba(0,0,0,0.5)",
                  padding: "2px 6px",
                  borderRadius: "4px",
                }}
              >
                📸 Unsplash
              </span>
            </div>

            {/* Resumen Completo */}
            <div>
              <h4 style={{ fontSize: "11px", fontWeight: "600", color: "var(--text-3)", textTransform: "uppercase", margin: "0 0 6px" }}>
                Explicación
              </h4>
              <p style={{ fontSize: "13px", color: "var(--text-2)", lineHeight: "1.6", margin: 0 }}>
                {selectedNode.summary}
              </p>
            </div>

            {/* Búsqueda sugerida en inglés */}
            <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: "6px", padding: "8px 10px", fontSize: "11px", border: "1px solid rgba(255,255,255,0.05)" }}>
              <span style={{ color: "var(--text-3)" }}>Search tag: </span>
              <code style={{ color: "#FBBF24", fontWeight: "600" }}>{selectedNode.image_query || "N/A"}</code>
            </div>

            {/* Conexiones en este nodo */}
            {selectedNode.connections && selectedNode.connections.length > 0 && (
              <div>
                <h4 style={{ fontSize: "11px", fontWeight: "600", color: "var(--text-3)", textTransform: "uppercase", margin: "0 0 6px" }}>
                  Relacionado con
                </h4>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {selectedNode.connections.map((connId) => {
                    const targetNode = nodes.find((n) => n.id === connId);
                    if (!targetNode) return null;
                    return (
                      <span
                        key={connId}
                        onClick={() => setSelectedNodeId(connId)}
                        style={{
                          fontSize: "11px",
                          color: "white",
                          background: "#1c1c38",
                          border: "1px solid var(--border)",
                          padding: "4px 8px",
                          borderRadius: "6px",
                          cursor: "pointer",
                          transition: "background 0.2s",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#2d2d5a")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "#1c1c38")}
                      >
                        🔗 {targetNode.label}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Footer del Panel con Acción a YouTube */}
          <div
            style={{
              padding: "12px 16px",
              borderTop: "1px solid var(--border)",
              background: "#0a0a16",
              flexShrink: 0,
            }}
          >
            <a
              href={`https://www.youtube.com/results?search_query=${encodeURIComponent(selectedNode.video_query || selectedNode.label)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: "#EF4444",
                border: "none",
                borderRadius: "8px",
                padding: "8px 16px",
                color: "white",
                fontWeight: "600",
                fontSize: "12px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                textDecoration: "none",
                transition: "opacity 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              {/* Icono de YouTube SVG */}
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.518 3.545 12 3.545 12 3.545s-7.518 0-9.388.508a3.003 3.003 0 0 0-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.11c1.87.508 9.388.508 9.388.508s7.518 0 9.388-.508a3.003 3.003 0 0 0 2.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
              Ver clase o recurso en YouTube
            </a>
          </div>
        </div>
      )}

      {/* CSS Animation Keyframes */}
      <style jsx global>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}
