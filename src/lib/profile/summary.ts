import { prisma } from "@/lib/prisma";

/**
 * Build a plain-text summary of the profile for use in AI prompts.
 * Pure-ish: reads from the database, no AI.
 */
export async function buildProfileSummary(): Promise<string> {
  const fields = await prisma.profileField.findMany();
  const fieldMap: Record<string, string> = {};
  for (const f of fields) fieldMap[f.key] = f.value;

  const skills = await prisma.skill.findMany({ orderBy: [{ group: "asc" }, { sort: "asc" }] });
  const experiences = await prisma.experience.findMany({ orderBy: { sort: "asc" } });
  const projects = await prisma.project.findMany({ orderBy: { sort: "asc" } });
  const educations = await prisma.education.findMany({ orderBy: { sort: "asc" } });
  const languages = await prisma.language.findMany({ orderBy: { sort: "asc" } });

  const lines: string[] = [];
  if (fieldMap.name) lines.push(`Name: ${fieldMap.name}`);
  if (fieldMap.headline) lines.push(`Headline: ${fieldMap.headline}`);
  if (fieldMap.location) lines.push(`Location: ${fieldMap.location}`);
  if (fieldMap.summary) lines.push(`Summary: ${fieldMap.summary}`);
  if (fieldMap.linkedin) lines.push(`LinkedIn: ${fieldMap.linkedin}`);
  if (fieldMap.github) lines.push(`GitHub: ${fieldMap.github}`);

  if (skills.length) {
    const grouped: Record<string, string[]> = {};
    for (const s of skills) {
      const g = s.group || "Other";
      (grouped[g] ??= []).push(s.label || s.name);
    }
    lines.push("Skills:");
    for (const [g, names] of Object.entries(grouped)) lines.push(`  ${g}: ${names.join(", ")}`);
  }

  if (experiences.length) {
    lines.push("Experience:");
    for (const e of experiences) {
      lines.push(`  ${e.role} at ${e.company}${e.location ? " (" + e.location + ")" : ""}`);
      if (e.startYear) lines.push(`    ${e.startYear}${e.startMonth ? "-" + e.startMonth : ""} to ${e.current ? "Present" : e.endYear ?? ""}`);
      for (const b of e.bullets.split("\n").filter(Boolean)) lines.push(`    - ${b}`);
    }
  }

  if (projects.length) {
    lines.push("Projects:");
    for (const p of projects) {
      lines.push(`  ${p.name}${p.link ? " (" + p.link + ")" : ""}`);
      for (const b of p.bullets.split("\n").filter(Boolean)) lines.push(`    - ${b}`);
    }
  }

  if (educations.length) {
    lines.push("Education:");
    for (const e of educations) lines.push(`  ${e.degree} — ${e.school}${e.startYear ? " (" + e.startYear + "-" + (e.endYear ?? "") + ")" : ""}`);
  }

  if (languages.length) {
    lines.push("Languages: " + languages.map((l) => `${l.name} (${l.level})`).join(", "));
  }

  return lines.join("\n");
}
