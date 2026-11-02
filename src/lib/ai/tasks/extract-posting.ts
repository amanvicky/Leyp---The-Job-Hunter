import { z } from "zod";
import type { Provider } from "../types";

export const EXTRACT_POSTING_VERSION = "extract-posting@1";

export const extractedSchema = z.object({
  title: z.string(),
  company: z.string(),
  location: z.string(),
  salary: z.string(),
  requirements: z.array(z.string()),
});

export type Extracted = z.infer<typeof extractedSchema>;

const SYSTEM = `You read job postings and extract facts.
Return JSON only, matching this shape exactly:
{"title":string,"company":string,"location":string,"salary":string,"requirements":string[]}
Use "" when the posting does not say. Never invent a value.
List at most 12 requirements, each a short phrase copied from the posting.`;

export class TaskShapeError extends Error {}

export async function extractPosting(provider: Provider, text: string, url?: string): Promise<Extracted> {
  const answer = await provider.chat({
    system: SYSTEM,
    user: `${url ? `Posting URL: ${url}\n\n` : ""}${text}`,
    schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        company: { type: "string" },
        location: { type: "string" },
        salary: { type: "string" },
        requirements: { type: "array", items: { type: "string" } },
      },
      required: ["title", "company", "location", "salary", "requirements"],
    },
    maxTokens: 1024,
  });

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripFence(answer));
  } catch {
    throw new TaskShapeError("The model's answer was not JSON. Ask it again.");
  }

  const result = extractedSchema.safeParse(parsed);
  if (!result.success) {
    const fields = result.error.issues.map((issue) => issue.path.join(".") || "_").join(", ");
    // Log what misfired, never the answer itself: it carries the posting.
    throw new TaskShapeError(`The model's answer did not come back in the expected shape: ${fields}`);
  }
  return result.data;
}

/** Models often wrap JSON in a markdown fence despite being asked not to. */
function stripFence(text: string): string {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(text);
  return (fenced?.[1] ?? text).trim();
}
