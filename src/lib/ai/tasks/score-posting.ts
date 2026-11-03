import { z } from "zod";

export const SCORE_POSTING_VERSION = "score-posting@1";

export const scorePostingSchema = z.object({
  score: z.number().int().min(0).max(100),
  reasons: z.array(z.string()).default([]),
  redFlags: z.array(z.string()).default([]),
});

export type ScorePostingResult = z.infer<typeof scorePostingSchema>;

export class ScorePostingShapeError extends Error {}

const SYSTEM = `You score a job posting against a candidate profile. Reply with JSON only.
Shape: {"score":0-100,"reasons":["..."],"redFlags":["..."]}
score is fit 0-100. reasons: why it fits. redFlags: concerns. Never invent facts.`;

export async function scorePosting(
  provider: { chat: (request: { system: string; user: string; schema?: object; maxTokens?: number }) => Promise<string> },
  input: { postingText: string; profileSummary: string },
): Promise<ScorePostingResult> {
  const user = `Posting:\n${input.postingText}\n\nProfile:\n${input.profileSummary}`;

  const answer = await provider.chat({
    system: SYSTEM,
    user,
    schema: {
      type: "object",
      properties: {
        score: { type: "number" },
        reasons: { type: "array", items: { type: "string" } },
        redFlags: { type: "array", items: { type: "string" } },
      },
      required: ["score", "reasons", "redFlags"],
    },
    maxTokens: 512,
  });

  let parsed: unknown;
  try { parsed = JSON.parse(stripFence(answer)); } catch {
    return { score: 50, reasons: [], redFlags: [] };
  }
  const result = scorePostingSchema.safeParse(parsed);
  if (!result.success) {
    const obj = parsed as Record<string, unknown>;
    return {
      score: typeof obj.score === "number" ? Math.round(obj.score) : 50,
      reasons: Array.isArray(obj.reasons) ? obj.reasons.filter((x): x is string => typeof x === "string") : [],
      redFlags: Array.isArray(obj.redFlags) ? obj.redFlags.filter((x): x is string => typeof x === "string") : [],
    };
  }
  return result.data;
}

function stripFence(text: string): string {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(text);
  return (fenced?.[1] ?? text).trim();
}
