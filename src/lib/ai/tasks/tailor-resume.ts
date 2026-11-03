import { z } from "zod";

export const TAILOR_RESUME_VERSION = "tailor-resume@1";

export const resumeUnitsSchema = z.object({
  units: z.array(z.object({ id: z.string(), text: z.string() })),
});

export type ResumeUnits = z.infer<typeof resumeUnitsSchema>;

export class TailorShapeError extends Error {}

const SYSTEM = `You tailor a resume to a job posting. Return JSON only:
{"units":[{"id":string,"text":string}]}
Use these unit ids: "headline", "summary", "experience-1", "experience-2", ... (one per role), "skills", "education".
Each text is the tailored content for that section, plain text, concise. Only use facts present in the profile and posting. Never invent.`;

export async function tailorResume(
  provider: { chat: (request: { system: string; user: string; schema?: object; maxTokens?: number }) => Promise<string> },
  input: { postingText: string; profileSummary: string; tone: string },
): Promise<ResumeUnits> {
  const user = `Tone: ${input.tone}\n\nPosting:\n${input.postingText}\n\nProfile:\n${input.profileSummary}`;
  const answer = await provider.chat({
    system: SYSTEM,
    user,
    schema: { type: "object", properties: { units: { type: "array", items: { type: "object", properties: { id: { type: "string" }, text: { type: "string" } }, required: ["id", "text"] } } }, required: ["units"] },
    maxTokens: 512,
  });
  let parsed: unknown;
  try { parsed = JSON.parse(stripFence(answer)); } catch {
    // Model did not return JSON. Wrap the whole answer as one unit so the
    // user still gets something usable.
    return { units: [{ id: "resume", text: answer.trim() }] };
  }
  const result = resumeUnitsSchema.safeParse(parsed);
  if (!result.success) {
    // Try to salvage: if there's a "text" or "content" field, use it.
    const obj = parsed as Record<string, unknown>;
    const text = typeof obj.text === "string" ? obj.text
      : typeof obj.content === "string" ? obj.content
      : typeof obj.resume === "string" ? obj.resume
      : null;
    if (text) return { units: [{ id: "resume", text }] };
    // Last resort: stringify the whole answer as one unit.
    return { units: [{ id: "resume", text: answer.trim() }] };
  }
  return result.data;
}

function stripFence(text: string): string {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(text);
  return (fenced?.[1] ?? text).trim();
}




