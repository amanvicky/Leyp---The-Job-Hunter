"use server";

import { serverAction } from "@/lib/action";
import { z } from "zod";
import { parseResume } from "@/lib/profile/import";
import {
  createEducation,
  createLanguage,
  createPublication,
  upsertProfileField,
} from "@/lib/profile/entities";
import { createExperience } from "@/lib/profile/experiences";
import { createProject } from "@/lib/profile/projects";
import { upsertSkill } from "@/lib/profile/skills";
import { prisma } from "@/lib/prisma";

const importResumeSchema = z.object({
  text: z.string().min(1, "Paste the resume first.").max(200_000),
  replaceExisting: z.boolean().default(false),
});

const LEVELS = ["NATIVE", "C2", "C1", "B2", "B1", "A2", "A1"];

/**
 * Import a resume from pasted text.
 *
 * Runs the offline parser first, so import works with no AI configured. The
 * result is reported item by item: the user is told exactly what was stored and
 * what was not recognised, rather than being shown a silent success.
 */
export const importResumeAction = serverAction(importResumeSchema, async (input) => {
  const parsed = parseResume(input.text);

  if (input.replaceExisting) {
    await prisma.experienceSkill.deleteMany({});
    await prisma.projectSkill.deleteMany({});
    await prisma.experience.deleteMany({});
    await prisma.project.deleteMany({});
    await prisma.education.deleteMany({});
    await prisma.language.deleteMany({});
    await prisma.skill.deleteMany({});
  }

  for (const field of parsed.fields) {
    await upsertProfileField(field.key, field.value);
  }

  let skills = 0;
  for (const skill of parsed.skills) {
    await upsertSkill(skill.name, { group: skill.group || undefined });
    skills += 1;
  }

  let experiences = 0;
  for (const experience of parsed.experiences) {
    await createExperience({
      role: experience.role,
      company: experience.company,
      location: experience.location,
      descriptor: "",
      startYear: experience.startYear,
      startMonth: experience.startMonth,
      endYear: experience.endYear,
      endMonth: experience.endMonth,
      current: experience.current,
      // The parser collects bullets as a list; storage keeps one per line.
      bullets: experience.bullets.join("\n"),
      skillIds: [],
    });
    experiences += 1;
  }

  let projects = 0;
  for (const project of parsed.projects) {
    if (!project.name) continue;
    await createProject({
      name: project.name,
      link: project.link,
      current: false,
      bullets: project.bullets.join("\n"),
      skillIds: [],
    });
    projects += 1;
  }

  let educations = 0;
  for (const education of parsed.educations) {
    if (!education.degree && !education.school) continue;
    await createEducation({
      degree: education.degree,
      school: education.school,
      startYear: education.startYear,
      endYear: education.endYear,
      current: false,
      notes: "",
    });
    educations += 1;
  }

  let languages = 0;
  for (const language of parsed.languages) {
    if (!language.name) continue;
    const level = LEVELS.includes(language.level) ? language.level : "B2";
    try {
      await createLanguage({ name: language.name, level });
      languages += 1;
    } catch {
      // A duplicate language name is not worth failing the whole import over.
    }
  }

  const counts = {
    fields: parsed.fields.length,
    skills,
    experiences,
    projects,
    educations,
    languages,
  };

  const wroteNothing = Object.entries(counts).every(([, value]) => value === 0);

  return {
    counts,
    warnings: parsed.warnings,
    wroteNothing,
    fields: parsed.fields.map((field) => field.key),
  };
});
