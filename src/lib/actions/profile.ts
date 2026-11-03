"use server";

import { z } from "zod";
import { serverAction } from "@/lib/action";
import {
  createEducation,
  createFact,
  createLanguage,
  createPublication,
  createReference,
  deleteEducation,
  deleteFact,
  deleteLanguage,
  deletePublication,
  deleteReference,
  upsertProfileField,
} from "@/lib/profile/entities";
import { createProject, deleteProject } from "@/lib/profile/projects";
import { createExperience, deleteExperience } from "@/lib/profile/experiences";
import { removeSkill, upsertSkill } from "@/lib/profile/skills";

/**
 * Profile mutations.
 *
 * Every handler receives already-validated input and returns plain data. The
 * session check, error logging and the `{ok, data}` envelope come from
 * `serverAction`, so none of that is repeated here.
 */

const basicsSchema = z.object({
  name: z.string().trim().max(120).optional(),
  email: z.string().trim().max(240).optional(),
  phone: z.string().trim().max(60).optional(),
  location: z.string().trim().max(120).optional(),
  headline: z.string().trim().max(160).optional(),
  summary: z.string().trim().max(2000).optional(),
  linkedin: z.string().trim().max(240).optional(),
  github: z.string().trim().max(240).optional(),
  website: z.string().trim().max(240).optional(),
});

const FIELD_KEYS = [
  "name", "email", "phone", "location", "headline", "summary", "linkedin", "github", "website",
] as const;

export const saveBasicsAction = serverAction(basicsSchema, async (input) => {
  const saved: string[] = [];
  for (const key of FIELD_KEYS) {
    const value = input[key];
    if (value === undefined) continue;
    // An empty string means "clear this field", which is a real edit.
    await upsertProfileField(key, value);
    saved.push(key);
  }
  return { saved };
});

const skillSchema = z.object({
  name: z.string().trim().min(1, "Give the skill a name.").max(60),
  group: z.string().trim().max(60).optional(),
});

export const addSkillAction = serverAction(skillSchema, async (input) => {
  const skill = await upsertSkill(input.name, { group: input.group });
  return { id: skill.id, name: skill.name, label: skill.label, group: skill.group };
});

const idSchema = z.object({ id: z.string().min(1) });

export const deleteSkillAction = serverAction(idSchema, async (input) => {
  await removeSkill(input.id);
  return { deleted: input.id };
});

const experienceSchema = z.object({
  role: z.string().trim().max(120).default(""),
  company: z.string().trim().max(120).default(""),
  location: z.string().trim().max(120).default(""),
  descriptor: z.string().trim().max(120).default(""),
  startYear: z.number().int().min(1950).max(2100).nullable().optional(),
  startMonth: z.number().int().min(1).max(12).nullable().optional(),
  endYear: z.number().int().min(1950).max(2100).nullable().optional(),
  endMonth: z.number().int().min(1).max(12).nullable().optional(),
  current: z.boolean().default(false),
  bullets: z.string().max(8000).default(""),
  skillIds: z.array(z.string()).default([]),
});

export const addExperienceAction = serverAction(experienceSchema, async (input) => {
  const experience = await createExperience(input);
  return { id: experience.id };
});

export const deleteExperienceAction = serverAction(idSchema, async (input) => {
  await deleteExperience(input.id);
  return { deleted: input.id };
});

const projectSchema = z.object({
  name: z.string().trim().min(1, "Give the project a name.").max(120),
  link: z.string().trim().max(240).default(""),
  startYear: z.number().int().min(1950).max(2100).nullable().optional(),
  startMonth: z.number().int().min(1).max(12).nullable().optional(),
  endYear: z.number().int().min(1950).max(2100).nullable().optional(),
  endMonth: z.number().int().min(1).max(12).nullable().optional(),
  current: z.boolean().default(false),
  bullets: z.string().max(8000).default(""),
  skillIds: z.array(z.string()).default([]),
});

export const addProjectAction = serverAction(projectSchema, async (input) => {
  const project = await createProject(input);
  return { id: project.id };
});

export const deleteProjectAction = serverAction(idSchema, async (input) => {
  await deleteProject(input.id);
  return { deleted: input.id };
});

const educationSchema = z.object({
  degree: z.string().trim().max(160).default(""),
  school: z.string().trim().max(160).default(""),
  startYear: z.number().int().min(1950).max(2100).nullable().optional(),
  startMonth: z.number().int().min(1).max(12).nullable().optional(),
  endYear: z.number().int().min(1950).max(2100).nullable().optional(),
  endMonth: z.number().int().min(1).max(12).nullable().optional(),
  current: z.boolean().default(false),
  notes: z.string().max(4000).default(""),
});

export const addEducationAction = serverAction(educationSchema, async (input) => {
  const education = await createEducation(input);
  return { id: education.id };
});

export const deleteEducationAction = serverAction(idSchema, async (input) => {
  await deleteEducation(input.id);
  return { deleted: input.id };
});

const languageSchema = z.object({
  name: z.string().trim().min(1, "Name the language.").max(60),
  level: z.enum(["NATIVE", "C2", "C1", "B2", "B1", "A2", "A1"]),
});

export const addLanguageAction = serverAction(languageSchema, async (input) => {
  const language = await createLanguage(input);
  return { id: language.id };
});

export const deleteLanguageAction = serverAction(idSchema, async (input) => {
  await deleteLanguage(input.id);
  return { deleted: input.id };
});

const publicationSchema = z.object({
  citation: z.string().trim().min(1, "A citation is required.").max(1000),
  link: z.string().trim().max(240).default(""),
  onResumes: z.boolean().default(true),
});

export const addPublicationAction = serverAction(publicationSchema, async (input) => {
  const publication = await createPublication(input);
  return { id: publication.id };
});

export const deletePublicationAction = serverAction(idSchema, async (input) => {
  await deletePublication(input.id);
  return { deleted: input.id };
});

const referenceSchema = z.object({
  name: z.string().trim().max(120).default(""),
  relation: z.string().trim().max(120).default(""),
  company: z.string().trim().max(120).default(""),
  email: z.string().trim().max(240).default(""),
  phone: z.string().trim().max(60).default(""),
});

export const addReferenceAction = serverAction(referenceSchema, async (input) => {
  const reference = await createReference(input);
  return { id: reference.id };
});

export const deleteReferenceAction = serverAction(idSchema, async (input) => {
  await deleteReference(input.id);
  return { deleted: input.id };
});

const factSchema = z.object({
  applicationId: z.string().nullable().optional(),
  text: z.string().trim().min(1, "Write the fact first.").max(2000),
});

export const addFactAction = serverAction(factSchema, async (input) => {
  const fact = await createFact(input);
  return { id: fact.id };
});

export const deleteFactAction = serverAction(idSchema, async (input) => {
  await deleteFact(input.id);
  return { deleted: input.id };
});
