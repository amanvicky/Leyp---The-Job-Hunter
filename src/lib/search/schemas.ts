import { z } from "zod";

export const postingSourceSchema = z.enum(["ADZUNA", "JSEARCH", "FREEHIRE"]);

export const postingQuerySchema = z.object({
  query: z.string().trim().min(1).max(200),
  location: z.string().trim().max(120).default(""),
  remote: z.boolean().optional(),
  salaryMin: z.number().int().nonnegative().optional(),
  salaryMax: z.number().int().nonnegative().optional(),
  page: z.number().int().positive().default(1),
});

export const postingScoreSchema = z.object({
  score: z.number().int().min(0).max(100),
  reasons: z.array(z.string()),
  redFlags: z.array(z.string()),
  scoredWith: z.string().min(1),
});

export const startupQuerySchema = z.object({
  query: z.string().trim().min(1).max(200),
  location: z.string().trim().max(120).default(""),
});

export const agentCandidateSchema = z.object({
  source: z.string().min(1),
  externalId: z.string().min(1),
  title: z.string(),
  company: z.string(),
  place: z.string().default(""),
  remote: z.boolean().nullable().optional(),
  salary: z.string().default(""),
  postedAt: z.string().datetime().nullable().optional(),
  url: z.string().default(""),
  via: z.string().default(""),
  description: z.string().default(""),
  complete: z.boolean().default(false),
  score: z.number().int().min(0).max(100).default(0),
  reasons: z.array(z.string()).nullable().optional(),
  redFlags: z.array(z.string()).nullable().optional(),
  status: z.enum(["SCORED", "DRAFTING", "DRAFTED", "APPROVED", "DISMISSED"]).default("SCORED"),
  dedupeKey: z.string().min(1),
});

export const startupSchema = z.object({
  source: z.string().min(1),
  externalId: z.string().min(1),
  company: z.string().min(1),
  website: z.string().default(""),
  summary: z.string().default(""),
  details: z.string().default(""),
  location: z.string().default(""),
  remote: z.boolean().nullable().optional(),
  stage: z.string().default(""),
  roles: z.array(z.string()).default([]),
  emails: z.array(z.string()).default([]),
  links: z.array(z.string()).default([]),
  postedAt: z.string().datetime().nullable().optional(),
  score: z.number().int().min(0).max(100).default(0),
  reasons: z.array(z.string()).default([]),
  scoredWith: z.string().default(""),
  status: z.enum(["NEW", "SAVED", "CONTACTED", "DISMISSED"]).default("NEW"),
});

export function dedupeKeyFor(source: string, externalId: string): string {
  return `${source}:${externalId}`.toLowerCase();
}
