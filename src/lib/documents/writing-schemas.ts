import { z } from "zod";

export const profileBasicsSchema = z.object({
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

export const resumeGenerateSchema = z.object({
  applicationId: z.string().min(1),
  tone: z.enum(["WARM", "FORMAL", "DIRECT", "ENTHUSIASTIC"]).default("WARM"),
});

export const coverLetterGenerateSchema = z.object({
  applicationId: z.string().min(1),
  tone: z.enum(["WARM", "FORMAL", "DIRECT", "ENTHUSIASTIC"]).default("WARM"),
});

export const emailGenerateSchema = z.object({
  applicationId: z.string().min(1),
  tone: z.enum(["WARM", "FORMAL", "DIRECT", "ENTHUSIASTIC"]).default("WARM"),
});

export const refineSchema = z.object({
  applicationId: z.string().min(1),
  kind: z.enum(["RESUME", "COVER_LETTER", "EMAIL"]),
  unitId: z.string().min(1),
  instruction: z.string().trim().min(1).max(2000),
});

export const trimSchema = z.object({
  applicationId: z.string().min(1),
  kind: z.enum(["RESUME", "COVER_LETTER", "EMAIL"]),
  targetChars: z.number().int().positive(),
});

export const chatRefineSchema = z.object({
  applicationId: z.string().min(1),
  kind: z.enum(["RESUME", "COVER_LETTER", "EMAIL"]),
  message: z.string().trim().min(1).max(8000),
});

export const matchSchema = z.object({
  applicationId: z.string().min(1),
});

export const factGuardSchema = z.object({
  skills: z.array(z.string()),
  profileSkills: z.array(z.string()),
});
