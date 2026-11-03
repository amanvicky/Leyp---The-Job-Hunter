import { describe, expect, it } from "vitest";
import {
  extractPostingOffline,
  extractRequirements,
  normalisePosting,
  parseSalaryRange,
} from "@/lib/applications/extract-offline";

const POSTING = `Senior Backend Engineer at Acme Corp
Location: Bengaluru, India
Salary: ₹24,00,000 – ₹36,00,000 per annum
Remote friendly

We are hiring a Senior Backend Engineer to own our payments platform.

Requirements:
- 5+ years of backend experience
- Strong TypeScript and PostgreSQL
- Experience with distributed systems
- Comfortable on-call

Nice to have:
- Kafka
- OpenTelemetry

Benefits
- Health insurance
- Stock options
`;

describe("offline posting extraction", () => {
  it("normalises line endings and trims trailing spaces", () => {
    const lines = normalisePosting("  hello  \r\n\r\n\r\nworld  \r\n");
    expect(lines).toEqual(["  hello", "", "world"]);
  });

  it("extracts the title, company and location", () => {
    const extracted = extractPostingOffline(POSTING);
    expect(extracted.title).toContain("Senior Backend Engineer");
    expect(extracted.company).toBe("Acme Corp");
    expect(extracted.location).toBe("Bengaluru, India");
    expect(extracted.confidence).toBe("high");
  });

  it("extracts the salary text", () => {
    const extracted = extractPostingOffline(POSTING);
    expect(extracted.salary).toContain("24,00,000");
  });

  it("collects only the requirements section", () => {
    const extracted = extractPostingOffline(POSTING);
    expect(extracted.requirements).toHaveLength(4);
    expect(extracted.requirements[0]).toContain("5+ years");
    expect(extracted.requirements.some((item) => item.includes("Kafka"))).toBe(false);
    expect(extracted.requirements.some((item) => item.includes("insurance"))).toBe(false);
  });

  it("falls back to bullets when there is no heading", () => {
    const text = `Engineer at Acme\n- Must know Go\n- Must know Postgres`;
    expect(extractRequirements(text)).toEqual(["Must know Go", "Must know Postgres"]);
  });

  it("stops the requirements section at the next heading", () => {
    const lines = extractRequirements(POSTING);
    expect(lines.every((line) => !/benefit/i.test(line))).toBe(true);
  });

  it("parses salary ranges into minor units", () => {
    expect(parseSalaryRange("₹24,00,000 – ₹36,00,000 per annum")).toEqual({
      min: 240000000,
      max: 360000000,
      currency: "INR",
    });
    expect(parseSalaryRange("$80k - $120k")).toEqual({
      min: 8000000,
      max: 12000000,
      currency: "USD",
    });
    expect(parseSalaryRange("no numbers here")).toEqual({
      min: null,
      max: null,
      currency: "INR",
    });
  });

  it("handles an empty posting without throwing", () => {
    const extracted = extractPostingOffline("");
    expect(extracted.requirements).toEqual([]);
    expect(extracted.confidence).toBe("low");
  });
});
