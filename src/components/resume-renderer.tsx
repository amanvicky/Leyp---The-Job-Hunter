"use client";

import { useState } from "react";
import { renderResumePdfAction } from "@/lib/actions/render-pdf";

export function ResumeRenderer({ themes, applications }: { themes: any[]; applications: any[] }) {
  const [htmlContent, setHtmlContent] = useState(`<!DOCTYPE html><html><head><style>
  body { font-family: Georgia, serif; margin: 40px; }
  h1 { font-size: 24px; margin-bottom: 4px; }
  .contact { color: #555; font-size: 12px; }
  section { margin-top: 16px; }
  h2 { font-size: 14px; border-bottom: 1px solid #ccc; padding-bottom: 2px; text-transform: uppercase; }
  .job { margin-bottom: 12px; }
  .job-header { font-weight: bold; }
  ul { margin: 6px 0; padding-left: 18px; }
  li { margin: 3px 0; }
</style></head><body>
  <h1>Your Name</h1>
  <p class="contact">email@example.com · phone · location</p>
  <section>
    <h2>Experience</h2>
    <div class="job">
      <div class="job-header">Role · Company · Year</div>
      <ul><li>Achievement one</li><li>Achievement two</li></ul>
    </div>
  </section>
  <section>
    <h2>Skills</h2>
    <p>Skill 1, Skill 2, Skill 3</p>
  </section>
</body></html>`);
  const [pdfData, setPdfData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleRender() {
    if (applications.length === 0) return;
    setLoading(true);
    const result = await renderResumePdfAction({ applicationId: applications[0].id, html: htmlContent });
    setLoading(false);
    if (result.ok) {
      setPdfData(result.data.base64);
    }
  }

  return (
    <div className="resume-renderer">
      <section className="card">
        <h2>Resume HTML</h2>
        <textarea
          value={htmlContent}
          onChange={(e) => setHtmlContent(e.target.value)}
          rows={16}
          style={{ width: "100%", fontFamily: "monospace", fontSize: "12px", padding: "8px", border: "1px solid var(--line)", borderRadius: "8px" }}
        />
        <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
          <button type="button" onClick={handleRender} className="button" disabled={loading || applications.length === 0}>
            {loading ? "Rendering..." : "Render PDF"}
          </button>
          <span className="muted">Theme: {themes[0]?.name || "None"}</span>
        </div>
      </section>

      {pdfData ? (
        <section className="card">
          <h2>Generated PDF</h2>
          <p className="muted">PDF generated successfully ({Math.round(pdfData.length * 0.75)} bytes approx)</p>
          <a
            href={`data:application/pdf;base64,${pdfData}`}
            download="resume.pdf"
            className="button"
            style={{ display: "inline-block", marginTop: "8px" }}
          >
            Download PDF
          </a>
        </section>
      ) : null}
    </div>
  );
}