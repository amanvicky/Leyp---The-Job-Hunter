import { z } from "zod";

export const REFINE_CHAT_VERSION = "refine-chat@1";

export const refineChatSchema = z.object({
  edits: z.array(z.object({ unitId: z.string(), previousText: z.string(), newText: z.string() })),
  reply: z.string().default(""),
});

export type RefineChatResult = z.infer<typeof refineChatSchema>;

export class RefineShapeError extends Error {}

const SYSTEM = `You edit document units based on a user instruction. Reply with JSON only.
Shape: {"edits":[{"unitId":"...","previousText":"old","newText":"new"}],"reply":"what you did"}
Only include units that changed. previousText must be the exact old text. Never invent facts.`;

export async function refineChat(
  provider: { chat: (request: { system: string; user: string; schema?: object; maxTokens?: number }) => Promise<string> },
  input: { instruction: string; units: { id: string; text: string }[] },
): Promise<RefineChatResult> {
  const unitsText = input.units.map((u) => `[${u.id}]\n${u.text}`).join("\n\n");
  const user = `Instruction: ${input.instruction}\n\nDocument units:\n${unitsText}`;

  const answer = await provider.chat({
    system: SYSTEM,
    user,
    schema: {
      type: "object",
      properties: {
        edits: { type: "array", items: { type: "object", properties: { unitId: { type: "string" }, previousText: { type: "string" }, newText: { type: "string" } }, required: ["unitId", "previousText", "newText"] } },
        reply: { type: "string" },
      },
      required: ["edits", "reply"],
    },
    maxTokens: 1024,
  });

  let parsed: unknown;
  try { parsed = JSON.parse(stripFence(answer)); } catch {
    return { edits: [], reply: answer.trim() };
  }
  const result = refineChatSchema.safeParse(parsed);
  if (!result.success) return { edits: [], reply: answer.trim() };
  return result.data;
}

function stripFence(text: string): string {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(text);
  return (fenced?.[1] ?? text).trim();
}
