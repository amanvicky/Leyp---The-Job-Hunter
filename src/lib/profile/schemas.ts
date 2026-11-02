import { createHash } from "node:crypto";
import { z } from "zod";

export const profileFieldSchema = z.object({
  key: z.enum(["name", "email", "phone", "location", "headline", "summary", "linkedin", "github", "website"]),
  value: z.string().max(2000),
});

export const skillSchema = z.object({
  name: z.string().trim().min(1).max(60),
  group: z.string().trim().max(60).optional(),
});

export const experienceSchema = z.object({
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

export const projectSchema = z.object({
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

export const educationSchema = z.object({
  degree: z.string().trim().max(160),
  school: z.string().trim().max(160),
  startYear: z.number().int().min(1950).max(2100).nullable().optional(),
  startMonth: z.number().int().min(1).max(12).nullable().optional(),
  endYear: z.number().int().min(1950).max(2100).nullable().optional(),
  endMonth: z.number().int().min(1).max(12).nullable().optional(),
  current: z.boolean().default(false),
  notes: z.string().max(4000).default(""),
});

export const languageSchema = z.object({
  name: z.string().trim().min(1).max(60),
  level: z.enum(["NATIVE", "C2", "C1", "B2", "B1", "A2", "A1"]),
});

export const factSchema = z.object({
  applicationId: z.string().nullable().optional(),
  text: z.string().trim().min(1).max(2000),
});

export const publicationSchema = z.object({
  citation: z.string().trim().min(1).max(1000),
  link: z.string().trim().max(240).default(""),
  onResumes: z.boolean().default(true),
});

export const referenceSchema = z.object({
  name: z.string().trim().max(120),
  relation: z.string().trim().max(120).default(""),
  company: z.string().trim().max(120).default(""),
  email: z.string().trim().max(240).default(""),
  phone: z.string().trim().max(60).default(""),
});

export const themeSchema = z.object({
  name: z.string().trim().min(1).max(80),
  headFont: z.string().trim().min(1).max(80),
  bodyFont: z.string().trim().min(1).max(80),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  layout: z.enum(["SINGLE", "SIDEBAR_LEFT", "SIDEBAR_RIGHT"]),
  align: z.enum(["LEFT", "JUSTIFY", "CENTRED"]),
  headingStyle: z.enum(["PLAIN", "RULE", "SMALL_CAPS", "UPPERCASE"]),
  density: z.enum(["COMPACT", "REGULAR", "AIRY"]),
  headerStyle: z.enum(["PLAIN", "STACKED", "INLINE", "CENTRED"]),
  sidebarStyle: z.enum(["PLAIN", "SHADED", "RULED"]),
  dateStyle: z.enum(["INLINE", "RIGHT", "UNDER"]),
  photoShape: z.enum(["CIRCLE", "ROUNDED", "SQUARE"]),
  photoPosition: z.enum(["HEADER_START", "HEADER_END", "SIDEBAR_TOP"]),
});

/** Lower-casing makes "Figma" and "figma" the same skill. */
export function normaliseSkillName(name: string): string {
  return name.trim().toLowerCase();
}

export function skillDedupeKey(name: string): string {
  return createHash("sha256").update(normaliseSkillName(name)).digest("hex");
}
