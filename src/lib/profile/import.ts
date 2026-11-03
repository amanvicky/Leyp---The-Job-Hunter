/**
 * Parse resume text into profile data.
 *
 * Deliberately rule-based and offline: a first import should work with no AI
 * configured, and should be predictable. The AI extractor is a second pass for
 * documents this cannot handle; it is not required for the common case.
 *
 * Pure: takes a string, returns data. No Prisma, no network, so it is tested by
 * feeding it fixtures.
 */

export interface ParsedExperience {
  role: string;
  company: string;
  location: string;
  startYear: number | null;
  startMonth: number | null;
  endYear: number | null;
  endMonth: number | null;
  current: boolean;
  bullets: string[];
}

export interface ParsedEducation {
  degree: string;
  school: string;
  startYear: number | null;
  endYear: number | null;
}

export interface ParsedResume {
  fields: { key: string; value: string }[];
  skills: { name: string; group: string }[];
  experiences: ParsedExperience[];
  educations: ParsedEducation[];
  projects: { name: string; link: string; bullets: string[] }[];
  languages: { name: string; level: string }[];
  warnings: string[];
}

const MONTHS: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/;
const PHONE = /(?:\+\d{1,3}[\s-]?)?(?:\(\d{2,4}\)[\s-]?)?\d{3,5}[\s-]?\d{3,5}(?:[\s-]?\d{2,4})?/;
const URL = /(?:https?:\/\/)?(?:www\.)?[\w-]+(?:\.[\w-]+)+\/[\w./#?=-]*/i;

/** Section headings people actually use, mapped to canonical names. */
const HEADINGS: { canonical: string; patterns: string[] }[] = [
  { canonical: "summary", patterns: ["summary", "profile", "objective", "about", "about me"] },
  { canonical: "experience", patterns: ["experience", "work experience", "employment", "employment history", "professional experience", "work history"] },
  { canonical: "education", patterns: ["education", "academic", "academics", "qualifications"] },
  { canonical: "skills", patterns: ["skills", "technical skills", "core skills", "core competencies", "technologies"] },
  { canonical: "projects", patterns: ["projects", "personal projects", "selected projects", "side projects"] },
  { canonical: "languages", patterns: ["languages", "language skills"] },
  { canonical: "publications", patterns: ["publications", "papers", "research"] },
  { canonical: "references", patterns: ["references", "referees"] },
];

const KNOWN_LEVELS = ["NATIVE", "C2", "C1", "B2", "B1", "A2", "A1", "FLUENT", "NATIVE LANGUAGE", "PROFESSIONAL"];

/** Strip common list markers so bullets compare cleanly. */
export function stripMarker(line: string): string {
  return line.replace(/^\s*[-–—•*·▪◦●]\s*/, "").trim();
}

/** A date seen in a resume: "Mar 2021", "03/2021", "2021", "Present". */
export interface ParsedDate {
  year: number | null;
  month: number | null;
  current: boolean;
}

export function parseDateToken(token: string): ParsedDate {
  const text = token.trim().toLowerCase();
  if (!text) return { year: null, month: null, current: false };
  if (/^(present|current|now|ongoing|today)$/.test(text)) {
    return { year: null, month: null, current: true };
  }

  // "Mar 2021" / "March 2021"
  const monthName = text.match(/^([a-z]{3,9})\.?\s+(\d{4})$/);
  if (monthName) {
    const month = MONTHS[monthName[1]!];
    if (month) return { year: Number(monthName[2]), month, current: false };
  }

  // "2021" alone
  const yearOnly = text.match(/^(\d{4})$/);
  if (yearOnly) return { year: Number(yearOnly[1]), month: null, current: false };

  // "03/2021", "3.2021", "2021-03"
  const numeric = text.match(/^(\d{1,2})[/.-](\d{4})$/) ?? text.match(/^(\d{4})[/.-](\d{1,2})$/);
  if (numeric) {
    const first = Number(numeric[1]);
    const second = Number(numeric[2]);
    const [month, year] = first > 12 ? [second, first] : [first, second];
    if (month >= 1 && month <= 12) return { year, month, current: false };
  }

  return { year: null, month: null, current: false };
}

/** "Mar 2021 - Present", "2020–2022", "01/2019 - 06/2020". */
export function parseRange(line: string): { start: ParsedDate; end: ParsedDate; rest: string } | null {
  const range = line.match(
    /((?:[A-Za-z]{3,9}\.?\s+)?\d{4}|\d{1,2}[/.-]\d{4})\s*(?:-|–|—|to|until)\s*((?:[A-Za-z]{3,9}\.?\s+)?\d{4}|\d{1,2}[/.-]\d{4}|present|current|now|ongoing)/i,
  );
  if (!range) return null;
  return {
    start: parseDateToken(range[1]!),
    end: parseDateToken(range[2]!),
    rest: line.replace(range[0], " ").replace(/\s+/g, " ").trim(),
  };
}

function headingFor(line: string): string | null {
  const cleaned = stripMarker(line)
    .replace(/[:：]\s*$/, "")
    .trim()
    .toLowerCase();
  if (!cleaned || cleaned.length > 40) return null;
  for (const heading of HEADINGS) {
    if (heading.patterns.includes(cleaned)) return heading.canonical;
  }
  return null;
}

/** Split the document into sections keyed by canonical heading. */
export function splitSections(text: string): { preamble: string[]; sections: Record<string, string[]> } {
  const lines = text.split(/\r?\n/);
  const sections: Record<string, string[]> = {};
  const preamble: string[] = [];
  let current: string | null = null;

  for (const line of lines) {
    const heading = headingFor(line);
    if (heading) {
      current = heading;
      sections[current] = sections[current] ?? [];
      continue;
    }
    if (current) sections[current]!.push(line);
    else preamble.push(line);
  }

  return { preamble, sections };
}

/** Strip a trailing level marker so "English (Native)" yields "English". */
export function splitLanguage(line: string): { name: string; level: string } | null {
  const cleaned = stripMarker(line);
  if (!cleaned) return null;

  const withParens = cleaned.match(/^(.+?)\s*[（(]\s*([^)）]+)\s*[)）]\s*$/);
  if (withParens) {
    const level = withParens[2]!.trim().toUpperCase();
    return { name: withParens[1]!.trim(), level: KNOWN_LEVELS.includes(level) ? normaliseLevel(level) : "B2" };
  }

  const withDash = cleaned.match(/^(.+?)\s*[-–—:]\s*(.+)$/);
  if (withDash) {
    const level = withDash[2]!.trim().toUpperCase();
    if (KNOWN_LEVELS.includes(level)) return { name: withDash[1]!.trim(), level: normaliseLevel(level) };
  }

  // A bare list of names with no levels.
  return { name: cleaned, level: "B2" };
}

function normaliseLevel(level: string): string {
  if (level === "NATIVE LANGUAGE" || level === "NATIVE") return "NATIVE";
  if (level === "FLUENT" || level === "PROFESSIONAL") return "C1";
  return level;
}

function parseExperienceSection(lines: string[]): ParsedExperience[] {
  const experiences: ParsedExperience[] = [];
  let current: ParsedExperience | null = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    const range = parseRange(line);
    const isBullet = /^\s*[-–—•*·▪◦●]/.test(raw);
    // A line that is nothing but dates belongs to the entry above it.
    const isDateOnly = range !== null && range.rest.trim().length === 0;

    if (isDateOnly) {
      if (current) {
        current.startYear = range.start.year ?? current.startYear;
        current.startMonth = range.start.month ?? current.startMonth;
        current.endYear = range.end.year ?? current.endYear;
        current.endMonth = range.end.month ?? current.endMonth;
        current.current = range.end.current;
      }
      continue;
    }

    // "Role | Company | Place" is a heading even without dates on the line.
    const looksLikeTitle =
      !isBullet && (range !== null || /[|·]/.test(line) || current === null) && /^[A-Z0-9]/.test(line);

    if (looksLikeTitle) {
      if (current) experiences.push(current);

      const rest = (range?.rest ?? line).replace(/\s*[|,]\s*/g, " · ").trim();
      const parts = rest.split(/\s*·\s*/).filter(Boolean);
      const role = parts[0] ?? "Role";
      const company = parts[1] ?? "";
      const location = parts[2] ?? "";

      current = {
        role,
        company,
        location,
        startYear: range?.start.year ?? null,
        startMonth: range?.start.month ?? null,
        endYear: range?.end.year ?? null,
        endMonth: range?.end.month ?? null,
        current: range?.end.current ?? false,
        bullets: [],
      };
      continue;
    }

    if (current) {
      const text = stripMarker(raw);
      if (text) current.bullets.push(text);
    }
  }

  if (current) experiences.push(current);
  return experiences.filter((item) => item.role || item.company);
}

function parseEducationSection(lines: string[]): ParsedEducation[] {
  const educations: ParsedEducation[] = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    const range = parseRange(line);
    // "2012 - 2016" on its own line describes the entry above it.
    if (range && range.rest.trim().length === 0) {
      const previous = educations[educations.length - 1];
      if (previous) {
        previous.startYear = range.start.year;
        previous.endYear = range.end.year;
      }
      continue;
    }

    const rest = (range?.rest ?? stripMarker(line)).replace(/\s*[|,]\s*/g, " · ").trim();
    if (!rest) continue;
    const parts = rest.split(/\s*·\s*/).filter(Boolean);
    educations.push({
      degree: parts[0] ?? "",
      school: parts[1] ?? "",
      startYear: range?.start.year ?? null,
      endYear: range?.end.year ?? null,
    });
  }

  return educations;
}

function parseSkillsSection(lines: string[]): { name: string; group: string }[] {
  const skills: { name: string; group: string }[] = [];
  const seen = new Set<string>();

  for (const raw of lines) {
    const line = stripMarker(raw);
    if (!line) continue;

    // "Languages: TypeScript, Go" keeps the group name.
    const grouped = raw.match(/^\s*([A-Za-z][A-Za-z /&+-]{1,30})\s*[:：]\s*(.+)$/);
    const group = grouped ? grouped[1]!.trim() : "";
    const body = grouped ? grouped[2]! : line;

    for (const piece of body.split(/[,;|·•]/)) {
      const name = piece.trim().replace(/\.$/, "");
      if (!name || name.length > 40) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      skills.push({ name, group });
    }
  }

  return skills;
}

/** Everything we can recognise, with no AI involved. */
export function parseResume(text: string): ParsedResume {
  const warnings: string[] = [];
  const { preamble, sections } = splitSections(text);
  const head = preamble.filter((line) => line.trim()).map((line) => line.trim());

  const fields: { key: string; value: string }[] = [];

  const email = text.match(EMAIL)?.[0];
  if (email) fields.push({ key: "email", value: email });

  const phoneMatch = text.match(PHONE)?.[0]?.trim();
  if (phoneMatch && phoneMatch.replace(/\D/g, "").length >= 7) {
    fields.push({ key: "phone", value: phoneMatch });
  }

  // The name is the first line that is not a contact detail or a heading.
  const nameLine = head.find(
    (line) =>
      !EMAIL.test(line) &&
      !/\d{3}/.test(line) &&
      !/^https?:/i.test(line) &&
      line.split(/\s+/).length <= 5 &&
      /^[A-Z]/.test(line),
  );
  if (nameLine) fields.push({ key: "name", value: nameLine.replace(/\s+/g, " ").trim() });

  const headlineLine = head.find(
    (line) =>
      line !== nameLine &&
      !EMAIL.test(line) &&
      !/\d{3}/.test(line) &&
      line.length <= 90 &&
      line.split(/\s+/).length <= 12,
  );
  if (headlineLine) fields.push({ key: "headline", value: headlineLine });

  const linkedin = text.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/[\w/%-]+/i)?.[0];
  if (linkedin) fields.push({ key: "linkedin", value: linkedin });

  const github = text.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[\w-]+/i)?.[0];
  if (github) fields.push({ key: "github", value: github });

  if (!fields.some((field) => field.key === "website")) {
    const other = text.match(URL)?.[0];
    if (other && !/linkedin|github/i.test(other)) fields.push({ key: "website", value: other });
  }

  const location = text.match(/^([A-Z][A-Za-z .'-]+,\s*[A-Z][A-Za-z .'-]+)$/m)?.[1];
  if (location) fields.push({ key: "location", value: location });

  const summary = (sections.summary ?? []).join(" ").replace(/\s+/g, " ").trim();
  if (summary) fields.push({ key: "summary", value: summary.slice(0, 2000) });

  const experiences = parseExperienceSection(sections.experience ?? []);
  const educations = parseEducationSection(sections.education ?? []);
  const skills = parseSkillsSection(sections.skills ?? []);
  const languages = (sections.languages ?? [])
    .flatMap((line) => line.split(/[,;|]/))
    .map((line) => splitLanguage(line))
    .filter((item): item is { name: string; level: string } => item !== null);

  const projects = (sections.projects ?? []).reduce<ParsedResume["projects"]>((list, raw) => {
    const line = stripMarker(raw);
    if (!line) return list;
    const isBullet = /^\s*[-–—•*·▪◦●]/.test(raw);
    if (!isBullet || list.length === 0) {
      list.push({ name: line.replace(/\s*[-–—]\s*$/, ""), link: line.match(URL)?.[0] ?? "", bullets: [] });
    } else {
      list[list.length - 1]!.bullets.push(line);
    }
    return list;
  }, []);

  if (experiences.length === 0) warnings.push("No experience section was recognised.");
  if (educations.length === 0) warnings.push("No education section was recognised.");
  if (skills.length === 0) warnings.push("No skills section was recognised.");

  return { fields, skills, experiences, educations, projects, languages, warnings };
}
