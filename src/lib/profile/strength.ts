import { z } from "zod";

export const strengthMeterSchema = z.object({
  basics: z.number().int().min(0).max(100),
  skills: z.number().int().min(0).max(100),
  experience: z.number().int().min(0).max(100),
  education: z.number().int().min(0).max(100),
});

export type StrengthInput = z.infer<typeof strengthMeterSchema>;

export function computeStrength(input: StrengthInput): { score: number; label: string } {
  const weights = { basics: 0.25, skills: 0.25, experience: 0.35, education: 0.15 };
  const score = Math.round(
    input.basics * weights.basics +
      input.skills * weights.skills +
      input.experience * weights.experience +
      input.education * weights.education,
  );
  const label = score >= 80 ? "Strong" : score >= 50 ? "Good" : score >= 25 ? "Building" : "Getting started";
  return { score, label };
}

export function basicsScore(fields: { name?: string; email?: string; headline?: string; summary?: string }): number {
  let score = 0;
  if (fields.name) score += 30;
  if (fields.email) score += 30;
  if (fields.headline) score += 20;
  if (fields.summary) score += 20;
  return score;
}

export function skillsScore(count: number): number {
  if (count === 0) return 0;
  if (count < 3) return 30;
  if (count < 8) return 60;
  if (count < 15) return 85;
  return 100;
}

export function experienceScore(count: number, hasBullets: boolean): number {
  if (count === 0) return 0;
  let score = Math.min(60, count * 20);
  if (hasBullets) score = Math.min(100, score + 40);
  return score;
}

export function educationScore(count: number): number {
  if (count === 0) return 0;
  return Math.min(100, count * 50);
}
