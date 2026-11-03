import { z } from "zod";

export const CLASSIFY_REPLY_VERSION = "classify-reply@1";

export const classifyReplySchema = z.object({
  classification: z.enum(["rejection", "interview", "question", "offer", "acknowledgement"]),
  confidence: z.number().min(0).max(1).default(0.5),
});

export type ClassifyReplyResult = z.infer<typeof classifyReplySchema>;

const SYSTEM = `You classify an employer's email reply. Reply with JSON only.
Shape: {"classification":"rejection|interview|question|offer|acknowledgement","confidence":0-1}`;

export async function classifyReply(
  provider: { chat: (request: { system: string; user: string; schema?: object; maxTokens?: number }) => Promise<string> },
  input: { emailText: string },
): Promise<ClassifyReplyResult> {
  const answer = await provider.chat({
    system: SYSTEM,
    user: `Email:\n${input.emailText}`,
    schema: { type: "object", properties: { classification: { type: "string", enum: ["rejection", "interview", "question", "offer", "acknowledgement"] }, confidence: { type: "number" } }, required: ["classification"] },
    maxTokens: 128,
  });
  let parsed: unknown;
  try { parsed = JSON.parse(stripFence(answer)); } catch { return { classification: "acknowledgement", confidence: 0.5 }; }
  const r = classifyReplySchema.safeParse(parsed);
  if (!r.success) {
    const obj = parsed as Record<string, unknown>;
    const c = typeof obj.classification === "string" ? obj.classification : "acknowledgement";
    return { classification: (["rejection","interview","question","offer","acknowledgement"].includes(c) ? c : "acknowledgement") as any, confidence: typeof obj.confidence === "number" ? obj.confidence : 0.5 };
  }
  return r.data;
}

function stripFence(text: string): string {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(text);
  return (fenced?.[1] ?? text).trim();
}
