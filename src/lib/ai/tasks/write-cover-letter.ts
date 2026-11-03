import { z } from "zod";

export const WRITE_COVER_LETTER_VERSION = "write-cover-letter@1";

export const coverLetterUnitsSchema = z.object({
  units: z.array(z.object({ id: z.string(), text: z.string() })),
});

export type CoverLetterUnits = z.infer<typeof coverLetterUnitsSchema>;

export class CoverLetterShapeError extends Error {}

const SYSTEM = `You write a cover letter for a job application. Return JSON only:
{"units":[{"id":string,"text":string}]}
Use unit ids: "greeting", "opening", "body-1", "body-2", "closing", "signoff".
Each text is a paragraph of the letter, plain text. Tone-aware. Only use facts from the profile and posting. Never invent.`;

export async function writeCoverLetter(
  provider: { chat: (request: { system: string; user: string; schema?: object; maxTokens?: number }) => Promise<string> },
  input: { postingText: string; profileSummary: string; tone: string },
): Promise<CoverLetterUnits> {
  const user = `Tone: ${input.tone}\n\nPosting:\n${input.postingText}\n\nProfile:\n${input.profileSummary}`;
  const answer = await provider.chat({
    system: SYSTEM,
    user,
    schema: { type: "object", properties: { units: { type: "array", items: { type: "object", properties: { id: { type: "string" }, text: { type: "string" } }, required: ["id", "text"] } } }, required: ["units"] },
    maxTokens: 512,
  });
  let parsed: unknown;
  try { parsed = JSON.parse(stripFence(answer)); } catch {
    return { units: [{ id: "letter", text: answer.trim() }] };
  }
  const result = coverLetterUnitsSchema.safeParse(parsed);
  if (!result.success) {
    const obj = parsed as Record<string, unknown>;
    if (typeof obj.units === "string") {
      try {
        const inner = JSON.parse(obj.units);
        const r = coverLetterUnitsSchema.safeParse(inner);
        if (r.success) return r.data;
      } catch { /* fall through */ }
    }
    const text = typeof obj.text === "string" ? obj.text
      : typeof obj.content === "string" ? obj.content
      : typeof obj.letter === "string" ? obj.letter
      : null;
    if (text) return { units: [{ id: "letter", text }] };
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      const units = Object.entries(parsed as Record<string, unknown>)
        .filter(([, v]) => typeof v === "string")
        .map(([k, v]) => ({ id: k, text: v as string }));
      if (units.length > 0) return { units };
    }
    return { units: [{ id: "letter", text: answer.trim() }] };
  }
  return result.data;
}

function stripFence(text: string): string {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(text);
  return (fenced?.[1] ?? text).trim();
}




