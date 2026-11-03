"use client";

import { useEffect, useState, useTransition } from "react";
import { previewResumeAction, renderResumePdfAction } from "@/lib/actions/render-pdf";

export interface ThemeOption {
  id: string;
  name: string;
  builtIn: boolean;
}

export function ResumePreview({
  themes,
  initialThemeId,
  initialHtml,
}: {
  themes: ThemeOption[];
  initialThemeId: string | null;
  initialHtml: string;
}) {
  const [themeId, setThemeId] = useState<string | null>(initialThemeId);
  const [html, setHtml] = useState(initialHtml);
  const [pdf, setPdf] = useState<{ base64: string; bytes: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [rendering, setRendering] = useState(false);

  useEffect(() => {
    if (!themeId || !initialThemeId) return;
    // Skip the first run: the server already sent this theme's HTML.
    let cancelled = false;
    setPdf(null);
    previewResumeAction({ themeId }).then((result) => {
      if (cancelled) return;
      if (result.ok) setHtml(result.data.html);
      else setError(result.error);
    });
    return () => {
      cancelled = true;
    };
  }, [themeId, initialThemeId]);

  function handleThemeChange(next: string) {
    setError(null);
    startTransition(() => setThemeId(next));
  }

  async function handleDownload() {
    setRendering(true);
    setError(null);
    const result = await renderResumePdfAction(themeId ? { themeId } : {});
    setRendering(false);
    if (result.ok) setPdf({ base64: result.data.base64, bytes: result.data.bytes });
    else setError(result.error);
  }

  return (
    <div className="resume-preview">
      <section className="card">
        <div style={{ display: "flex", gap: "12px", alignItems: "end", flexWrap: "wrap" }}>
          <label style={{ flex: "1 1 220px" }}>
            <span className="muted" style={{ display: "block", marginBottom: "4px" }}>
              Theme
            </span>
            <select
              value={themeId ?? ""}
              onChange={(event) => handleThemeChange(event.target.value)}
              style={{ width: "100%", padding: "8px", border: "1px solid var(--line)", borderRadius: "8px" }}
            >
              {themes.map((theme) => (
                <option key={theme.id} value={theme.id}>
                  {theme.name}
                  {theme.builtIn ? "" : " (custom)"}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={handleDownload} className="button" disabled={rendering || pending}>
            {rendering ? "Rendering PDF…" : "Download PDF"}
          </button>
        </div>

        {error ? (
          <p className="error" role="alert" style={{ marginTop: "8px" }}>
            {error}
          </p>
        ) : null}

        {pdf ? (
          <p style={{ marginTop: "8px" }}>
            <a
              href={`data:application/pdf;base64,${pdf.base64}`}
              download="resume.pdf"
              className="button"
              style={{ display: "inline-block" }}
            >
              Save resume.pdf
            </a>{" "}
            <span className="muted">{Math.round(pdf.bytes / 1024)} KB</span>
          </p>
        ) : null}
      </section>

      <section className="card">
        <h2>Preview</h2>
        <iframe
          title="Resume preview"
          srcDoc={html}
          sandbox=""
          style={{
            width: "100%",
            height: "900px",
            border: "1px solid var(--line)",
            borderRadius: "8px",
            background: "#fff",
            opacity: pending ? 0.5 : 1,
          }}
        />
      </section>
    </div>
  );
}
