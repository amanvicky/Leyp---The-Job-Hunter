"use server";

import { z } from "zod";
import { serverAction } from "@/lib/action";
import { upsertProfileField } from "@/lib/profile/entities";
import { upsertSkill } from "@/lib/profile/skills";
import { createExperience } from "@/lib/profile/experiences";
import { createProject } from "@/lib/profile/projects";
import { createEducation, createLanguage, createFact } from "@/lib/profile/entities";

const basicsSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(240),
  phone: z.string().trim().max(60).optional(),
  location: z.string().trim().max(120).optional(),
  headline: z.string().trim().max(160).optional(),
  summary: z.string().trim().max(2000).optional(),
  linkedin: z.string().trim().max(240).optional(),
  github: z.string().trim().max(240).optional(),
  website: z.string().trim().max(240).optional(),
});

export const saveBasicsAction = serverAction(basicsSchema, async (input) => {
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined && value !== null && value !== "") {
      await upsertProfileField(key, String(value));
    }
  }
  return { saved: true };
});

const skillSchema = z.object({ name: z.string().trim().min(1).max(60), group: z.string().trim().max(60).optional() });

export const addSkillAction = serverAction(skillSchema, async (input) => {
  return upsertSkill(input.name, { group: input.group });
});

const experienceSchema = z.object({
  role: z.string().trim().max(120),
  company: z.string().trim().max(120),
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
  return createExperience(input);
});

const projectSchema = z.object({
  name: z.string().trim().max(120),
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
  return createProject(input);
});

const educationSchema = z.object({
  degree: z.string().trim().max(160),
  school: z.string().trim().max(160),
  startYear: z.number().int().min(1950).max(2100).nullable().optional(),
  startMonth: z.number().int().min(1).max(12).nullable().optional(),
  endYear: z.number().int().min(1950).max(2100).nullable().optional(),
  endMonth: z.number().int().min(1).max(12).nullable().optional(),
  current: z.boolean().default(false),
  notes: z.string().max(4000).default(""),
});

export const addEducationAction = serverAction(educationSchema, async (input) => {
  return createEducation(input);
});

const languageSchema = z.object({
  name: z.string().trim().min(1).max(60),
  level: z.enum(["NATIVE", "C2", "C1", "B2", "B1", "A2", "A1"]),
});

export const addLanguageAction = serverAction(languageSchema, async (input) => {
  return createLanguage(input);
});

const factSchema = z.object({
  applicationId: z.string().nullable().optional(),
  text: z.string().trim().min(1).max(2000),
});

export const addFactAction = serverAction(factSchema, async (input) => {
  return createFact(input);
});