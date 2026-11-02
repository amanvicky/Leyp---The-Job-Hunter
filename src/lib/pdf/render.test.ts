import { describe, expect, it } from "vitest";
import { renderPdf } from "./render";

describe("pdf rendering", () => {
  it("produces a non-empty PDF from HTML", async () => {
    const pdf = await renderPdf("<h1>Hello Leyp</h1><p>A short paragraph.</p>");
    expect(pdf.length).toBeGreaterThan(1000);
    expect(pdf.toString("latin1", 0, 8)).toContain("%PDF");
  });

  it("respects the format option", async () => {
    const pdf = await renderPdf("<p>Letter size.</p>", { format: "Letter" });
    expect(pdf.length).toBeGreaterThan(500);
    expect(pdf.toString("latin1", 0, 8)).toContain("%PDF");
  });
});
