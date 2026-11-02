import { prisma } from "@/lib/prisma";
import { serverAction } from "@/lib/action";
import { z } from "zod";
import { upsertPosting } from "@/lib/search/postings";
import { createAgentCandidate } from "@/lib/search/agents";
import { upsertStartup } from "@/lib/search/startups";

const postingSchema = z.object({
  source: z.string().min(1),
  externalId: z.string().min(1),
  title: z.string().default(""),
  company: z.string().default(""),
  place: z.string().default(""),
  remote: z.boolean().nullable().optional(),
  salary: z.string().default(""),
  salaryMin: z.number().int().nullable().optional(),
  salaryMax: z.number().int().nullable().optional(),
  currency: z.string().default("INR"),
  postedAt: z.string().datetime().nullable().optional(),
  url: z.string().default(""),
  via: z.string().default(""),
  description: z.string().default(""),
  complete: z.boolean().default(false),
});

export const upsertPostingAction = serverAction(postingSchema, async (input) => {
  return upsertPosting(input);
});

const candidateSchema = z.object({
  source: z.string().min(1),
  externalId: z.string().min(1),
  title: z.string().default(""),
  company: z.string().default(""),
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
});

export const createCandidateAction = serverAction(candidateSchema, async (input) => {
  const { dedupeKeyFor } = await import("@/lib/search/schemas");
  return createAgentCandidate({ ...input, dedupeKey: dedupeKeyFor(input.source, input.externalId) } as Parameters<typeof createAgentCandidate>[0] & { dedupeKey: string });
});

const startupSchema = z.object({
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

export const upsertStartupAction = serverAction(startupSchema, async (input) => {
  return upsertStartup(input);
});

const noteSchema = z.object({
  applicationId: z.string().min(1),
  body: z.string().trim().min(1).max(4000),
});

export const addSearchNoteAction = serverAction(noteSchema, async (input) => {
  const { addNote } = await import("@/lib/applications/core");
  return addNote(input.applicationId, input.body);
});
