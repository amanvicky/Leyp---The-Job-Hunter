"use client";

import { useState } from "react";

export function ThemePreview({ html }: { html: string }) {
  const [zoom, setZoom] = useState(1);

  return (
    <div className="theme-preview">
      <div className="theme-preview-toolbar">
        <button type="button" onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}>
          −
        </button>
        <span>{Math.round(zoom * 100)}%</span>
        <button type="button" onClick={() => setZoom((z) => Math.min(2, z + 0.1))}>
          +
        </button>
      </div>
      <div className="theme-preview-frame" style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}>
        <iframe srcDoc={html} title="Theme preview" sandbox="allow-same-origin" />
      </div>
    </div>
  );
}
