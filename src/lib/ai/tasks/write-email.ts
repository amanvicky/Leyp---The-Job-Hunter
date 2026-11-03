import { z } from "zod";

export const WRITE_EMAIL_VERSION = "write-email@1";

export const writeEmailSchema = z.object({
  subject: z.string(),
  body: z.string(),
});

export type WriteEmailResult = z.infer<typeof writeEmailSchema>;

export class WriteEmailShapeError extends Error {}

const SYSTEM = `You write a short professional email to apply for a job. Reply with JSON only.
Shape: {"subject":"...","body":"..."}
Use the candidate profile and posting. Never invent facts. Keep it under 200 words.`;

export async function writeEmail(
  provider: { chat: (request: { system: string; user: string; schema?: object; maxTokens?: number }) => Promise<string> },
  input: { postingText: string; profileSummary: string; tone: string },
): Promise<WriteEmailResult> {
  const user = `Tone: ${input.tone}\n\nPosting:\n${input.postingText}\n\nProfile:\n${input.profileSummary}`;

  const answer = await provider.chat({
    system: SYSTEM,
    user,
    schema: {
      type: "object",
      properties: { subject: { type: "string" }, body: { type: "string" } },
      required: ["subject", "body"],
    },
    maxTokens: 512,
  });

  let parsed: unknown;
  try { parsed = JSON.parse(stripFence(answer)); } catch {
    return { subject: "Application", body: answer.trim() };
  }
  const result = writeEmailSchema.safeParse(parsed);
  if (result.success) {
    const r = result.data;
    // The model sometimes nests the real payload inside body.
    if (r.body.trim().startsWith("{")) {
      try {
        const inner = JSON.parse(r.body);
        const r2 = writeEmailSchema.safeParse(inner);
        if (r2.success) return r2.data;
      } catch { /* fall through */ }
    }
    return r;
  }
  const obj = parsed as Record<string, unknown>;
  let subject = typeof obj.subject === "string" ? obj.subject : "Application";
  let body = typeof obj.body === "string" ? obj.body : answer.trim();
  // Handle double-encoded JSON.
  let cleaned = body;
  if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
    try { cleaned = JSON.parse(cleaned); } catch { /* fall through */ }
  }
  if (typeof cleaned === "string" && cleaned.trim().startsWith("{")) {
    try {
      const inner = JSON.parse(cleaned);
      if (typeof inner.subject === "string") subject = inner.subject;
      if (typeof inner.body === "string") body = inner.body;
    } catch { /* fall through */ }
  }
  return { subject, body };
}

function stripFence(text: string): string {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(text);
  return (fenced?.[1] ?? text).trim();
}


