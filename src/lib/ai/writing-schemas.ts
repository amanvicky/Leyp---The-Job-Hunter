import { z } from "zod";

export const extractedPostingSchema = z.object({
  title: z.string(),
  company: z.string(),
  location: z.string(),
  salary: z.string(),
  requirements: z.array(z.string()),
});

export type ExtractedPosting = z.infer<typeof extractedPostingSchema>;

export const matchResultSchema = z.object({
  score: z.number().int().min(0).max(100),
  reasons: z.array(z.string()),
  redFlags: z.array(z.string()),
  missingSkills: z.array(z.string()),
});

export type MatchResult = z.infer<typeof matchResultSchema>;

export const trimResultSchema = z.object({
  units: z.array(z.object({ id: z.string(), text: z.string() })),
  trimmed: z.string(),
});

export const factGuardResultSchema = z.object({
  ok: z.boolean(),
  unknownSkills: z.array(z.string()),
});

export function checkFactGuard(skills: string[], profileSkills: string[]): { ok: boolean; unknownSkills: string[] } {
  const allowed = new Set(profileSkills.map((skill) => skill.toLowerCase()));
  const unknown = skills.filter((skill) => !allowed.has(skill.toLowerCase()));
  return { ok: unknown.length === 0, unknownSkills: unknown };
}
