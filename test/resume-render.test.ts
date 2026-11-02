import { describe, expect, it } from "vitest";
import { renderPdf } from "@/lib/pdf/render";

describe("resume rendering", () => {
  it("renders a simple resume to PDF", async () => {
    const html = `<!DOCTYPE html><html><head><style>
      body { font-family: Georgia, serif; margin: 40px; }
      h1 { font-size: 24px; margin-bottom: 4px; }
      .contact { color: #555; font-size: 12px; }
      section { margin-top: 16px; }
      h2 { font-size: 14px; border-bottom: 1px solid #ccc; padding-bottom: 2px; }
    </style></head><body>
      <h1>Aman Vicky</h1>
      <p class="contact">aman@example.com · Bangalore · github.com/amanvicky</p>
      <section>
        <h2>Experience</h2>
        <p><strong>Backend Engineer</strong> · Acme · 2022–Present</p>
        <ul><li>Built the payments pipeline.</li><li>Reduced latency by 40%.</li></ul>
      </section>
      <section>
        <h2>Skills</h2>
        <p>Python, SQL, TypeScript, React</p>
      </section>
    </body></html>`;
    const pdf = await renderPdf(html);
    expect(pdf.length).toBeGreaterThan(2000);
    expect(pdf.toString("latin1", 0, 8)).toContain("%PDF");
  });
});
