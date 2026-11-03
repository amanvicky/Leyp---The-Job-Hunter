/**
 * Read a pasted job posting without an AI.
 *
 * The AI extractor is better at prose, but it needs a configured provider and a
 * network round trip. This module covers the ordinary case offline: a posting
 * has a title, a company, a place, sometimes a salary, and a list of
 * requirements behind familiar headings.
 *
 * Pure: string in, data out.
 */

export interface ExtractedPostingOffline {
  title: string;
  company: string;
  location: string;
  salary: string;
  requirements: string[];
  /** How the values were found, so the UI can say "guessed" versus "stated". */
  confidence: "high" | "medium" | "low";
}

const SALARY = /(?:₹|rs\.?|inr|\$|usd|€|eur|£|gbp)\s?[\d,.]+\s?(?:k|lpa|lakh|lakhs|per annum|pa|\/yr|\/month|per month)?(?:\s?(?:-|–|to)\s?(?:₹|rs\.?|inr|\$|usd|€|eur|£|gbp)?\s?[\d,.]+\s?(?:k|lpa|lakh|lakhs|per annum|pa|\/yr|\/month|per month)?)?/i;

const COMPANY_HINTS = [
  /(?:at|@)\s+([A-Z][\w&.'-]*(?:\s+[A-Z][\w&.'-]*){0,2})(?=\s*(?:\n|location|salary|remote|we|is|are|$))/i,
  /^([A-Z][\w&.'-]*(?:\s+[A-Z][\w&.'-]*){0,2})\s+(?:is|are)\s+(?:hiring|looking)/m,
];

const LOCATION_LINE = /^(?:location|based in|office)\s*[:—-]\s*(.+)$/im;
const REMOTE_HINT = /\b(remote|work from home|wfh|anywhere|distributed)\b/i;

const TITLE_HINTS = [
  /^(?:job title|role|position|title)\s*[:—-]\s*(.+)$/im,
  /^#\s*(.+)$/m,
  /^(.+?)\s+(?:at|@)\s+.+$/m,
];

const REQUIREMENT_HEADINGS =
  /^\s*(?:requirements?|qualifications?|what you'?ll need|who you are|must have|skills?|about you|you have|we'?re looking for)\s*:?\s*$/im;

/** Split a posting into lines, dropping the decoration people paste in. */
export function normalisePosting(text: string): string[] {
  return text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/\s+$/, ""))
    .filter((line, index, all) => {
      // Collapse runs of blank lines but keep one as a paragraph break.
      if (line.trim() !== "") return true;
      return index > 0 && index < all.length - 1 && all[index - 1]?.trim() !== "";
    });
}

function firstMatch(patterns: RegExp[], text: string): string {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return clean(match[1]);
  }
  return "";
}

function clean(value: string): string {
  return value
    .replace(/^[\s\-–—•*·:]+/, "")
    .replace(/[\s\-–—•*·:]+$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** The requirements section, as bullets, or the whole posting if unheaded. */
export function extractRequirements(text: string): string[] {
  const lines = normalisePosting(text);
  const headingIndex = lines.findIndex((line) => REQUIREMENT_HEADINGS.test(line));

  const collected: string[] = [];
  const start = headingIndex === -1 ? 0 : headingIndex + 1;

  if (headingIndex === -1) {
    // No heading: keep bulleted lines anywhere in the posting.
    for (const line of lines) {
      if (/^\s*[-–—•*·▪◦●]\s+/.test(line)) {
        const item = clean(line.replace(/^\s*[-–—•*·▪◦●]\s+/, ""));
        if (item.length >= 8) collected.push(item);
      }
    }
    return dedupe(collected).slice(0, 12);
  }

  for (let index = start; index < lines.length; index += 1) {
    const line = lines[index]!;
    if (/^\s*$/.test(line)) {
      // One blank line does not end a section; two in a row do.
      if (/^\s*$/.test(lines[index + 1] ?? "")) break;
      continue;
    }
    // A new heading ends the section.
    if (/^[A-Z][A-Za-z' ]{2,30}:?\s*$/.test(line) && !/^\s*[-–—•*·]/.test(line)) break;

    const item = clean(line.replace(/^\s*(?:[-–—•*·▪◦●]|\d+[.)])\s+/, ""));
    if (item.length >= 4) collected.push(item);
  }

  return dedupe(collected).slice(0, 12);
}

function dedupe(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

/** Everything the offline reader can state about a posting. */
export function extractPostingOffline(text: string, url = ""): ExtractedPostingOffline {
  const lines = normalisePosting(text);
  const body = lines.join("\n");

  const titleFromLabel = firstMatch(TITLE_HINTS, body);
  // "Senior Engineer at Acme" is common enough to be worth recognising.
  const titleAtCompany = body.match(/^(.{3,80}?)\s+(?:at|@)\s+(.{2,60})$/m);
  const title = (titleFromLabel || titleAtCompany?.[1] || lines.find((l) => l.trim()) || "").trim().slice(0, 200);

  const company =
    firstMatch(COMPANY_HINTS, body) || (titleAtCompany?.[2] ? clean(titleAtCompany[2]) : "") || "";

  const location = firstMatch([LOCATION_LINE], body) || (REMOTE_HINT.test(body) ? "Remote" : "");

  const salary = body.match(SALARY)?.[0]?.trim() ?? "";

  const requirements = extractRequirements(text);

  const found = [title, company, location, salary].filter(Boolean).length;
  const confidence: ExtractedPostingOffline["confidence"] =
    found >= 3 ? "high" : found === 2 ? "medium" : "low";

  return { title, company, location, salary, requirements, confidence };
}

/** Parse "₹18,00,000 – ₹24,00,000 a year" into minor units, for sorting. */
export function parseSalaryRange(salary: string): { min: number | null; max: number | null; currency: string } {
  const currency = /₹|inr|rs/i.test(salary) ? "INR" : /\$|usd/i.test(salary) ? "USD" : /€|eur/i.test(salary) ? "EUR" : /£|gbp/i.test(salary) ? "GBP" : "INR";

  const numbers = [...salary.matchAll(/(\d[\d,.]*)\s*(k|lpa|lakh|lakhs|cr|crore)?/gi)].map((match) => {
    const raw = Number(match[1]!.replace(/,/g, ""));
    if (Number.isNaN(raw)) return null;
    const unit = (match[2] ?? "").toLowerCase();
    const multiplier = unit === "k" ? 1_000 : unit === "lpa" || unit === "lakh" || unit === "lakhs" ? 100_000 : unit === "cr" || unit === "crore" ? 10_000_000 : 1;
    return Math.round(raw * multiplier);
  }).filter((value): value is number => value !== null);

  if (numbers.length === 0) return { min: null, max: null, currency };

  const values = numbers.map((value) => value * 100); // minor units
  return {
    min: values[0] ?? null,
    max: values.length > 1 ? values[values.length - 1]! : values[0]!,
    currency,
  };
}
