import { chromium } from "playwright";

/**
 * Render an HTML document to a PDF buffer.
 *
 * Uses the locally installed Chromium. Returns the bytes; the caller writes
 * them to a Response with content-type application/pdf.
 */
export async function renderPdf(html: string, options: { format?: "A4" | "Letter" } = {}): Promise<Buffer> {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle" });
    const pdf = await page.pdf({
      format: options.format ?? "A4",
      printBackground: true,
      margin: { top: "12mm", bottom: "12mm", left: "14mm", right: "14mm" },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
