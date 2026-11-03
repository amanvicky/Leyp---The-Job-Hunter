"use client";

import { useState } from "react";
import { createThemeAction, updateThemeAction } from "@/lib/actions/themes";
import { ThemePreview } from "@/components/theme-preview";

export function ThemeBuilder({ themes }: { themes: any[] }) {
  const [name, setName] = useState("");
  const [headFont, setHeadFont] = useState("Inter");
  const [bodyFont, setBodyFont] = useState("Inter");
  const [accent, setAccent] = useState("#1a73e8");
  const [layout, setLayout] = useState("SINGLE");
  const [previewHtml, setPreviewHtml] = useState("");

  async function handleCreate() {
    if (!name.trim()) return;
    const result = await createThemeAction({
      name,
      headFont,
      bodyFont,
      accent,
      layout: layout as any,
      align: "LEFT",
      headingStyle: "PLAIN",
      density: "REGULAR",
      headerStyle: "PLAIN",
      sidebarStyle: "PLAIN",
      dateStyle: "INLINE",
      photoShape: "CIRCLE",
      photoPosition: "HEADER_END",
    });
    if (result.ok) {
      window.location.reload();
    }
  }

  function generatePreview() {
    const html = `<!DOCTYPE html><html><head><style>
      body { font-family: ${bodyFont}, -apple-system, BlinkMacSystemFont, sans-serif; margin: 40px; line-height: 1.6; }
      h1 { font-family: ${headFont}, sans-serif; font-size: 28px; margin-bottom: 4px; color: ${accent}; }
      .contact { color: #666; font-size: 13px; margin-bottom: 24px; }
      h2 { font-family: ${headFont}, sans-serif; font-size: 16px; margin-top: 28px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: ${accent}; border-bottom: 2px solid ${accent}; padding-bottom: 4px; }
      .job { margin-bottom: 16px; }
      .job-title { font-weight: 600; }
      ul { margin: 8px 0; padding-left: 20px; }
      li { margin: 4px 0; }
    </style></head><body>
      <h1>John Doe</h1>
      <p class="contact">john@example.com · +91 98765 43210 · Bengaluru, India</p>
      <h2>Experience</h2>
      <div class="job">
        <div class="job-title">Senior Software Engineer · Tech Corp</div>
        <div style="color: #666; font-size: 13px;">2022 - Present</div>
        <ul><li>Led development of microservices architecture</li><li>Improved system performance by 40%</li></ul>
      </div>
      <h2>Education</h2>
      <div class="job">
        <div class="job-title">B.Tech Computer Science · IIT Delhi</div>
        <div style="color: #666; font-size: 13px;">2018 - 2022</div>
      </div>
      <h2>Skills</h2>
      <p>React, Node.js, TypeScript, PostgreSQL, AWS</p>
    </body></html>`;
    setPreviewHtml(html);
  }

  return (
    <div className="theme-builder">
      <section className="card">
        <h2>Create custom theme</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
          <label>
            <div className="muted" style={{ marginBottom: "4px" }}>Name</div>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="My Theme" style={{ width: "100%", padding: "8px", border: "1px solid var(--line)", borderRadius: "8px" }} />
          </label>
          <label>
            <div className="muted" style={{ marginBottom: "4px" }}>Accent color</div>
            <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} style={{ width: "100%", height: "40px", border: "1px solid var(--line)", borderRadius: "8px" }} />
          </label>
          <label>
            <div className="muted" style={{ marginBottom: "4px" }}>Heading font</div>
            <input value={headFont} onChange={(e) => setHeadFont(e.target.value)} style={{ width: "100%", padding: "8px", border: "1px solid var(--line)", borderRadius: "8px" }} />
          </label>
          <label>
            <div className="muted" style={{ marginBottom: "4px" }}>Body font</div>
            <input value={bodyFont} onChange={(e) => setBodyFont(e.target.value)} style={{ width: "100%", padding: "8px", border: "1px solid var(--line)", borderRadius: "8px" }} />
          </label>
          <label>
            <div className="muted" style={{ marginBottom: "4px" }}>Layout</div>
            <select value={layout} onChange={(e) => setLayout(e.target.value)} style={{ width: "100%", padding: "8px", border: "1px solid var(--line)", borderRadius: "8px" }}>
              <option value="SINGLE">Single column</option>
              <option value="SIDEBAR_LEFT">Sidebar left</option>
              <option value="SIDEBAR_RIGHT">Sidebar right</option>
            </select>
          </label>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button type="button" onClick={generatePreview} className="button">Preview</button>
          <button type="button" onClick={handleCreate} className="button">Create Theme</button>
        </div>
      </section>

      {previewHtml ? (
        <section className="card">
          <h2>Live Preview</h2>
          <ThemePreview html={previewHtml} />
        </section>
      ) : null}

      <section className="card">
        <h2>Your Themes ({themes.length})</h2>
        <div className="theme-grid">
          {themes.map((theme: any) => (
            <article key={theme.id} className="theme-card">
              <header>
                <h3>{theme.name}</h3>
                {theme.builtIn ? <span className="badge">Built-in</span> : <span className="badge">Custom</span>}
              </header>
              <div className="theme-swatch" style={{ background: theme.accent }} />
              <dl>
                <dt>Fonts</dt>
                <dd>{theme.headFont} / {theme.bodyFont}</dd>
                <dt>Layout</dt>
                <dd>{theme.layout}</dd>
              </dl>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}