import { z } from "zod";

export const DRAFT_REPLY_VERSION = "draft-reply@1";

export const draftReplySchema = z.object({
  answer: z.string(),
  gaps: z.array(z.string()).default([]),
});

export type DraftReplyResult = z.infer<typeof draftReplySchema>;

const SYSTEM = `You draft a reply to an employer email. Reply with JSON only.
Shape: {"answer":"...","gaps":["..."]}
answer: the drafted reply. gaps: things you could not answer from the profile.`;

export async function draftReply(
  provider: { chat: (request: { system: string; user: string; schema?: object; maxTokens?: number }) => Promise<string> },
  input: { emailText: string; profileSummary: string },
): Promise<DraftReplyResult> {
  const user = `Email:\n${input.emailText}\n\nProfile:\n${input.profileSummary}`;

  const answer = await provider.chat({
    system: SYSTEM,
    user,
    schema: { type: "object", properties: { answer: { type: "string" }, gaps: { type: "array", items: { type: "string" } } }, required: ["answer"] },
    maxTokens: 512,
  });
  let parsed: unknown;
  try { parsed = JSON.parse(stripFence(answer)); } catch { return { answer: answer.trim(), gaps: [] }; }
  const r = draftReplySchema.safeParse(parsed);
  if (r.success) {
    const res = r.data;
    if (res.answer.trim().startsWith("{")) {
      try {
        const inner = JSON.parse(res.answer);
        const r2 = draftReplySchema.safeParse(inner);
        if (r2.success) return r2.data;
      } catch { /* fall through */ }
    }
    return res;
  }
  const obj = parsed as Record<string, unknown>;
  let ans = typeof obj.answer === "string" ? obj.answer : answer.trim();
  const gaps = Array.isArray(obj.gaps) ? obj.gaps.filter((x): x is string => typeof x === "string") : [];
  if (ans.trim().startsWith("{")) {
    try {
      const inner = JSON.parse(ans);
      if (typeof inner.answer === "string") ans = inner.answer;
    } catch { /* fall through */ }
  }
  return { answer: ans, gaps };
}

function stripFence(text: string): string {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(text);
  return (fenced?.[1] ?? text).trim();
}

