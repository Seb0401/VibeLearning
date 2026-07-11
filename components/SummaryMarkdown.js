"use client";
import ReactMarkdown from "react-markdown";

export default function SummaryMarkdown({ text }) {
  if (!text) return null;
  return (
    <ReactMarkdown
      components={{
        h1: ({ children }) => <h1 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", margin: "14px 0 7px" }}>{children}</h1>,
        h2: ({ children }) => <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", margin: "11px 0 5px" }}>{children}</h2>,
        h3: ({ children }) => <h3 style={{ fontSize: 13, fontWeight: 600, color: "var(--text-2)", margin: "9px 0 4px" }}>{children}</h3>,
        p: ({ children }) => <p style={{ margin: "0 0 9px", lineHeight: 1.7 }}>{children}</p>,
        strong: ({ children }) => <strong style={{ color: "var(--text)", fontWeight: 600 }}>{children}</strong>,
        ul: ({ children }) => <ul style={{ paddingLeft: 18, margin: "0 0 9px" }}>{children}</ul>,
        ol: ({ children }) => <ol style={{ paddingLeft: 18, margin: "0 0 9px" }}>{children}</ol>,
        li: ({ children }) => <li style={{ marginBottom: 4 }}>{children}</li>,
        code: ({ children }) => <code style={{ background: "rgba(124,108,248,0.1)", color: "var(--accent)", borderRadius: 4, padding: "1px 5px", fontSize: "0.87em" }}>{children}</code>,
      }}
    >
      {text}
    </ReactMarkdown>
  );
}
