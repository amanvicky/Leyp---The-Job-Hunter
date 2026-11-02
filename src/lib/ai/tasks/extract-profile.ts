import { z } from "zod";
import { EXTRACT_POSTING_VERSION } from "./extract-posting";

export const EXTRACT_PROFILE_VERSION = "extract-profile@1";

export const extractedProfileSchema = z.object({
  name: z.string().default(""),
  email: z.string().default(""),
  phone: z.string().default(""),
  location: z.string().default(""),
  headline: z.string().default(""),
  summary: z.string().default(""),
  linkedin: z.string().default(""),
  github: z.string().default(""),
  website: z.string().default(""),
  skills: z.array(z.string()).default([]),
  languages: z.array(z.object({ name: z.string(), level: z.string() })).default([]),
  experiences: z.array(z.object({
    role: z.string(),
    company: z.string(),
    location: z.string().default(""),
    startYear: z.number().nullable().optional(),
    startMonth: z.number().nullable().optional(),
    endYear: z.number().nullable().optional(),
    endMonth: z.number().nullable().optional(),
    current: z.boolean().default(false),
    bullets: z.array(z.string()).default([]),
    skills: z.array(z.string()).default([]),
  })).default([]),
  projects: z.array(z.object({
    name: z.string(),
    link: z.string().default(""),
    bullets: z.array(z.string()).default([]),
    skills: z.array(z.string()).default([]),
  })).default([]),
  education: z.array(z.object({
    degree: z.string(),
    school: z.string(),
    startYear: z.number().nullable().optional(),
    endYear: z.number().nullable().optional(),
    notes: z.string().default(""),
  })).default([]),
  publications: z.array(z.string()).default([]),
});

export type ExtractedProfile = z.infer<typeof extractedProfileSchema>;

export class ProfileShapeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProfileShapeError";
  }
}

function stripFence(text: string): string {
  const trimmed = text.trim();
  const fence = trimmed.match(/^```(?:json)?\s*\n([\s\S]*?)\n```$/);
  return fence ? (fence[1] ?? "").trim() : trimmed;
}

export async function extractProfile(
  provider: { chat: (request: { system: string; user: string; schema?: object }) => Promise<string> },
  resumeText: string,
): Promise<ExtractedProfile> {
  const request = {
    system: `You are a resume parser. Extract structured profile data from the resume text. Return JSON matching the schema. Only include information present in the resume. Do not invent anything.`,
    user: `Resume text:\n${resumeText}`,
    schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        email: { type: "string" },
        phone: { type: "string" },
        location: { type: "string" },
        headline: { type: "string" },
        summary: { type: "string" },
        linkedin: { type: "string" },
        github: { type: "string" },
        website: { type: "string" },
        skills: { type: "array", items: { type: "string" } },
        languages: { type: "array", items: { type: "object", properties: { name: { type: "string" }, level: { type: "string" } } } },
        experiences: { type: "array", items: { type: "object" } },
        projects: { type: "array", items: { type: "object" } },
        education: { type: "array", items: { type: "object" } },
        publications: { type: "array", items: { type: "string" } },
      },
    },
  };

  const answer = await provider.chat(request);
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripFence(answer));
  } catch {
    throw new ProfileShapeError("The model's answer was not JSON.");
  }

  const result = extractedProfileSchema.safeParse(parsed);
  if (!result.success) {
    const fields = result.error.issues.map((i) => i.path.join(".")).filter(Boolean);
    throw new ProfileShapeError(`The model's answer did not match the expected shape: ${fields.join(", ") || "unknown"}.`);
  }

  return result.data;
}


