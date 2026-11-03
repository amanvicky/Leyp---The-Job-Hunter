/**
 * Build resume HTML from profile data and a theme.
 *
 * Pure on purpose: no Prisma, no filesystem, no network. The caller loads the
 * data and the theme, this turns them into a single self-contained document,
 * and `renderPdf` turns that into bytes. Because it is pure it can be tested by
 * comparing strings, which is the only way to keep a layout honest over time.
 */

export interface ResumeTheme {
  name: string;
  headFont: string;
  bodyFont: string;
  accent: string;
  layout: "SINGLE" | "SIDEBAR_LEFT" | "SIDEBAR_RIGHT";
  align: "LEFT" | "JUSTIFY" | "CENTRED";
  headingStyle: "PLAIN" | "RULE" | "SMALL_CAPS" | "UPPERCASE";
  density: "COMPACT" | "REGULAR" | "AIRY";
  headerStyle: "PLAIN" | "STACKED" | "INLINE" | "CENTRED";
  sidebarStyle: "PLAIN" | "SHADED" | "RULED";
  dateStyle: "INLINE" | "RIGHT" | "UNDER";
  photoShape: "CIRCLE" | "ROUNDED" | "SQUARE";
  photoPosition: "HEADER_START" | "HEADER_END" | "SIDEBAR_TOP";
}

export interface ResumeExperience {
  role: string;
  company: string;
  location?: string;
  descriptor?: string;
  startYear?: number | null;
  startMonth?: number | null;
  endYear?: number | null;
  endMonth?: number | null;
  current?: boolean;
  bullets?: string;
  skills?: string[];
}

export interface ResumeProject {
  name: string;
  link?: string;
  startYear?: number | null;
  endYear?: number | null;
  current?: boolean;
  bullets?: string;
  skills?: string[];
}

export interface ResumeEducation {
  degree: string;
  school: string;
  startYear?: number | null;
  endYear?: number | null;
  current?: boolean;
  notes?: string;
}

export interface ResumeLanguage {
  name: string;
  level: string;
}

export interface ResumePublication {
  citation: string;
  link?: string;
}

export interface ResumeProfile {
  fields: Record<string, string>;
  skills: { name: string; group?: string }[];
  experiences: ResumeExperience[];
  projects: ResumeProject[];
  educations: ResumeEducation[];
  languages: ResumeLanguage[];
  publications?: ResumePublication[];
  photoDataUrl?: string | null;
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** "2021" / "Mar 2021". A year without a month is deliberately vague. */
export function formatMonthYear(year?: number | null, month?: number | null): string {
  if (!year) return "";
  if (!month || month < 1 || month > 12) return String(year);
  return `${MONTHS[month - 1]} ${year}`;
}

export function formatRange(
  start: { year?: number | null; month?: number | null },
  end: { year?: number | null; month?: number | null },
  current?: boolean,
): string {
  const from = formatMonthYear(start.year, start.month);
  const to = current ? "Present" : formatMonthYear(end.year, end.month);
  if (from && to) return `${from} – ${to}`;
  return from || to;
}

/** Escape everything that came from the database. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Bullets arrive as one newline-separated blob; blank lines are not bullets. */
export function splitBullets(bullets?: string): string[] {
  if (!bullets) return [];
  return bullets
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*[-•*]\s*/, "").trim())
    .filter((line) => line.length > 0);
}

const DENSITY = {
  COMPACT: { gap: "10px", line: "1.35", section: "14px" },
  REGULAR: { gap: "14px", line: "1.5", section: "20px" },
  AIRY: { gap: "20px", line: "1.65", section: "28px" },
} as const;

function headingRule(theme: ResumeTheme): string {
  switch (theme.headingStyle) {
    case "RULE":
      return `border-bottom: 1.5px solid ${theme.accent}; padding-bottom: 2px;`;
    case "SMALL_CAPS":
      return "font-variant: small-caps; letter-spacing: 0.06em;";
    case "UPPERCASE":
      return "text-transform: uppercase; letter-spacing: 0.09em;";
    case "PLAIN":
    default:
      return "";
  }
}

function dateCell(theme: ResumeTheme, text: string): string {
  if (!text) return "";
  switch (theme.dateStyle) {
    case "RIGHT":
      return `<span class="dates">${escapeHtml(text)}</span>`;
    case "UNDER":
      return `<div class="dates under">${escapeHtml(text)}</div>`;
    case "INLINE":
    default:
      return `<span class="dates inline">${escapeHtml(text)}</span>`;
  }
}

function bulletsHtml(bullets?: string): string {
  const lines = splitBullets(bullets);
  if (lines.length === 0) return "";
  return `<ul>${lines.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>`;
}

function contactLine(fields: Record<string, string>): string {
  const parts = [fields.email, fields.phone, fields.location].filter(Boolean);
  return parts.map((part) => escapeHtml(part!)).join('<span class="sep"> · </span>');
}

function linksLine(fields: Record<string, string>): string {
  const parts = [fields.linkedin, fields.github, fields.website].filter(Boolean);
  if (parts.length === 0) return "";
  return parts.map((part) => escapeHtml(part!)).join('<span class="sep"> · </span>');
}

function headerHtml(profile: ResumeProfile, theme: ResumeTheme): string {
  const name = profile.fields.name || "Your Name";
  const headline = profile.fields.headline || "";
  const contact = contactLine(profile.fields);
  const links = linksLine(profile.fields);

  const photo = profile.photoDataUrl
    ? `<img class="photo" src="${escapeHtml(profile.photoDataUrl)}" alt="" />`
    : "";

  const body = `
${photo}
<h1>${escapeHtml(name)}</h1>
${headline ? `<p class="headline">${escapeHtml(headline)}</p>` : ""}
${contact ? `<p class="contact">${contact}</p>` : ""}
${links ? `<p class="contact">${links}</p>` : ""}`;

  switch (theme.headerStyle) {
    case "CENTRED":
      return `<header class="header centred">${body}</header>`;
    case "STACKED":
      return `<header class="header stacked">${body}</header>`;
    case "INLINE":
      return `<header class="header inline">${body}</header>`;
    case "PLAIN":
    default:
      return `<header class="header">${body}</header>`;
  }
}

function summaryHtml(profile: ResumeProfile): string {
  const summary = profile.fields.summary;
  if (!summary) return "";
  return `<section class="section"><h2>Summary</h2><p>${escapeHtml(summary)}</p></section>`;
}

function skillsHtml(profile: ResumeProfile): string {
  if (profile.skills.length === 0) return "";
  const groups = new Map<string, string[]>();
  for (const skill of profile.skills) {
    const key = skill.group?.trim() || "Skills";
    const list = groups.get(key) ?? [];
    list.push(skill.name);
    groups.set(key, list);
  }

  const rows = [...groups.entries()]
    .map(([group, names]) => {
      const label = group === "Skills" ? "" : `<strong>${escapeHtml(group)}:</strong> `;
      return `<p class="skill-row">${label}${names.map((n) => escapeHtml(n)).join(", ")}</p>`;
    })
    .join("");

  return `<section class="section"><h2>Skills</h2>${rows}</section>`;
}

function experienceHtml(profile: ResumeProfile, theme: ResumeTheme): string {
  if (profile.experiences.length === 0) return "";
  const items = profile.experiences
    .map((job) => {
      const range = formatRange(
        { year: job.startYear, month: job.startMonth },
        { year: job.endYear, month: job.endMonth },
        job.current,
      );
      const sub = [job.company, job.location, job.descriptor].filter(Boolean).map((p) => escapeHtml(p!)).join(" · ");
      return `<article class="entry">
  <div class="entry-head"><strong>${escapeHtml(job.role || "Role")}</strong>${dateCell(theme, range)}</div>
  ${sub ? `<div class="entry-sub">${sub}</div>` : ""}
  ${bulletsHtml(job.bullets)}
</article>`;
    })
    .join("\n");
  return `<section class="section"><h2>Experience</h2>${items}</section>`;
}

function projectsHtml(profile: ResumeProfile, theme: ResumeTheme): string {
  if (profile.projects.length === 0) return "";
  const items = profile.projects
    .map((project) => {
      const range = formatRange(
        { year: project.startYear },
        { year: project.endYear },
        project.current,
      );
      return `<article class="entry">
  <div class="entry-head"><strong>${escapeHtml(project.name || "Project")}</strong>${dateCell(theme, range)}</div>
  ${project.link ? `<div class="entry-sub">${escapeHtml(project.link)}</div>` : ""}
  ${bulletsHtml(project.bullets)}
</article>`;
    })
    .join("\n");
  return `<section class="section"><h2>Projects</h2>${items}</section>`;
}

function educationHtml(profile: ResumeProfile, theme: ResumeTheme): string {
  if (profile.educations.length === 0) return "";
  const items = profile.educations
    .map((education) => {
      const range = formatRange(
        { year: education.startYear },
        { year: education.endYear },
        education.current,
      );
      return `<article class="entry">
  <div class="entry-head"><strong>${escapeHtml(education.degree || "Degree")}</strong>${dateCell(theme, range)}</div>
  ${education.school ? `<div class="entry-sub">${escapeHtml(education.school)}</div>` : ""}
  ${education.notes ? `<div class="entry-note">${escapeHtml(education.notes)}</div>` : ""}
</article>`;
    })
    .join("\n");
  return `<section class="section"><h2>Education</h2>${items}</section>`;
}

function languagesHtml(profile: ResumeProfile): string {
  if (profile.languages.length === 0) return "";
  const list = profile.languages
    .map((language) => `${escapeHtml(language.name)} (${escapeHtml(language.level)})`)
    .join(", ");
  return `<section class="section"><h2>Languages</h2><p>${list}</p></section>`;
}

function publicationsHtml(profile: ResumeProfile): string {
  const publications = profile.publications ?? [];
  if (publications.length === 0) return "";
  const items = publications
    .map((publication) => `<li>${escapeHtml(publication.citation)}${publication.link ? ` — ${escapeHtml(publication.link)}` : ""}</li>`)
    .join("");
  return `<section class="section"><h2>Publications</h2><ul>${items}</ul></section>`;
}

function styles(theme: ResumeTheme): string {
  const density = DENSITY[theme.density] ?? DENSITY.REGULAR;
  const align = theme.align === "JUSTIFY" ? "justify" : theme.align === "CENTRED" ? "center" : "left";
  const sidebarLayout = theme.layout !== "SINGLE";
  const sidebarSide = theme.layout === "SIDEBAR_RIGHT" ? "right" : "left";
  const sidebarBg =
    theme.sidebarStyle === "SHADED"
      ? `background: ${theme.accent}0f; padding: 0 16px 0 0;`
      : theme.sidebarStyle === "RULED"
        ? `border-${sidebarSide}: 1px solid ${theme.accent}33; padding: 0 16px 0 0;`
        : "";

  return `
@page { size: A4; margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  font-family: "${theme.bodyFont}", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 10.5pt;
  line-height: ${density.line};
  color: #1a1a1a;
  text-align: ${align};
}
.page { padding: 18mm 16mm; }
.header { margin-bottom: ${density.section}; }
.header h1 {
  font-family: "${theme.headFont}", Georgia, serif;
  font-size: 22pt;
  margin: 0 0 2px 0;
  color: ${theme.accent};
  letter-spacing: -0.01em;
}
.header .headline { margin: 0 0 4px 0; font-size: 11pt; color: #444; }
.header .contact { margin: 0; font-size: 9.5pt; color: #555; }
.header .sep { color: #bbb; }
.header.centred { text-align: center; }
.header.inline h1 { display: inline; margin-right: 10px; }
.header.stacked { border-bottom: 2px solid ${theme.accent}; padding-bottom: 8px; }
.header .photo {
  width: 68px; height: 68px; object-fit: cover; float: right; margin: 0 0 8px 12px;
  border-radius: ${theme.photoShape === "CIRCLE" ? "50%" : theme.photoShape === "ROUNDED" ? "8px" : "0"};
}
.section { margin-bottom: ${density.section}; }
.section h2 {
  font-family: "${theme.headFont}", Georgia, serif;
  font-size: 11.5pt;
  margin: 0 0 ${density.gap};
  color: ${theme.accent};
  ${headingRule(theme)}
}
.section p { margin: 0 0 6px; }
.entry { margin-bottom: ${density.gap}; page-break-inside: avoid; }
.entry-head { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
.entry-head strong { font-size: 11pt; }
.entry-sub { color: #555; font-size: 9.5pt; margin-top: 1px; }
.entry-note { color: #555; font-size: 9.5pt; margin-top: 2px; }
.dates { color: #666; font-size: 9.5pt; white-space: nowrap; }
.dates.inline { margin-left: 8px; }
.dates.under { margin-top: 2px; }
ul { margin: 5px 0 0; padding-left: 16px; }
li { margin: 2px 0; }
.skill-row { margin: 0 0 3px; }
${sidebarLayout ? `.layout-sidebar .page {
  display: grid;
  grid-template-columns: ${theme.layout === "SIDEBAR_LEFT" ? "34% 66%" : "66% 34%"};
  gap: 20px;
}
.layout-sidebar .main { ${theme.layout === "SIDEBAR_RIGHT" ? "order: 1;" : "order: 2;"} }
.layout-sidebar .side { ${theme.layout === "SIDEBAR_RIGHT" ? "order: 2;" : "order: 1;"} ${sidebarBg} }
.layout-sidebar .side .section h2 { font-size: 10.5pt; }` : ""}
`;
}

/**
 * Render the whole document.
 *
 * Sections that have no data are omitted entirely rather than printed empty,
 * so a thin profile produces a short resume instead of a page of headings.
 */
export function renderResumeHtml(profile: ResumeProfile, theme: ResumeTheme): string {
  const sidebarLayout = theme.layout !== "SINGLE";

  const mainSections = [
    summaryHtml(profile),
    experienceHtml(profile, theme),
    projectsHtml(profile, theme),
    educationHtml(profile, theme),
    publicationsHtml(profile),
  ].filter(Boolean).join("\n");

  const sideSections = [skillsHtml(profile), languagesHtml(profile)].filter(Boolean).join("\n");

  const body = sidebarLayout
    ? `<div class="page"><div class="main">${mainSections}</div><div class="side">${headerHtml(profile, theme)}${sideSections}</div></div>`
    : `<div class="page">${headerHtml(profile, theme)}${mainSections}${sideSections}</div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(profile.fields.name || "Resume")}</title>
<style>${styles(theme)}</style>
</head>
<body class="${sidebarLayout ? "layout-sidebar" : "layout-single"}">
${body}
</body>
</html>`;
}
