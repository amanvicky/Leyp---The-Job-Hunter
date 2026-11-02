import { z } from "zod";

export const chatRoleSchema = z.enum(["USER", "AI"]);

export const chatMessageInputSchema = z.object({
  applicationId: z.string().min(1),
  text: z.string().trim().min(1).max(8000),
  targetUnit: z.string().max(80).optional(),
});

export const chatEditSchema = z.object({
  unitId: z.string().min(1),
  previousText: z.string(),
  newText: z.string(),
});

export const aiProviderKindSchema = z.enum(["openai", "anthropic", "mistral", "ollama"]);
export const aiProviderSchema = z.object({
  kind: aiProviderKindSchema,
  model: z.string().min(1),
  apiKey: z.string().optional(),
  baseUrl: z.string().url().optional(),
  timeoutSeconds: z.number().int().positive().optional(),
});

export const aiSettingsSchema = z.object({
  provider: aiProviderSchema,
  factGuard: z.boolean().default(true),
});
