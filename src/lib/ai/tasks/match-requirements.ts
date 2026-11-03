import { z } from "zod";

export const MATCH_REQUIREMENTS_VERSION = "match-requirements@1";

export const matchRequirementsSchema = z.object({ score: z.number().int().min(0).max(100), report: z.string().default("") });

export type MatchRequirements = z.infer<typeof matchRequirementsSchema>;

export class MatchShapeError extends Error {}

const SYSTEM = `You are a recruiter. Compare the job requirements to the candidate profile. Reply with JSON only. No extra text.\nShape: {"score":0-100,"report":"short paragraph describing fit, strengths, and gaps"}\nExample: {"score":75,"report":"Strong Go and SQL skills. Missing Kubernetes experience."}\nNever invent facts.`;

export async function matchRequirements(
  provider: { chat: (request: { system: string; user: string; schema?: object; maxTokens?: number }) => Promise<string> },
  input: { postingText: string; requirements: string[]; profileSummary: string },
): Promise<MatchRequirements> {
  const user = `Requirements:\n${input.requirements.map((r, i) => `${i + 1}. ${r}`).join("\n")}\n\nProfile:\n${input.profileSummary}`;

  const answer = await provider.chat({
    system: SYSTEM,
    user,
    schema: { type: "object", properties: { score: { type: "number" }, report: { type: "string" } }, required: ["score", "report"] },
    maxTokens: 512,
  });

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripFence(answer));
  } catch {
    throw new MatchShapeError("The model's answer was not JSON.");
  }
  const result = matchRequirementsSchema.safeParse(parsed);
  if (!result.success) {
    const fields = result.error.issues.map((i) => i.path.join(".") || "_").join(", ");
    throw new MatchShapeError(`The model's answer did not come back in the expected shape: ${fields}`);
  }
  return result.data;
}

function stripFence(text: string): string {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(text);
  return (fenced?.[1] ?? text).trim();
}


