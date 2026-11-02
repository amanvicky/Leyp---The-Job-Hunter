import type { Provider } from "@/lib/ai/types";
import { loadProvider } from "@/lib/ai";
import { z } from "zod";

export interface AiConfig {
  kind: "openai" | "anthropic" | "mistral" | "ollama";
  model: string;
  apiKey?: string;
  baseUrl?: string;
  timeoutSeconds?: number;
}

export function createProvider(config: AiConfig, fetchImpl: typeof fetch = fetch): Provider {
  const providerKind = config.kind === "openai" ? "openai"
    : config.kind === "anthropic" ? "anthropic"
    : config.kind === "mistral" ? "mistral"
    : "local";
  const baseUrl = config.baseUrl ?? (config.kind === "ollama" ? "http://localhost:11434/v1" : "");
  return loadProvider(
    {
      provider: providerKind,
      url: baseUrl,
      model: config.model,
      key: config.apiKey ?? "",
      timeoutSeconds: config.timeoutSeconds,
    },
    { fetchImpl: fetchImpl },
  );
}

export const aiConfigSchema = z.object({
  kind: z.enum(["openai", "anthropic", "mistral", "ollama"]),
  model: z.string().min(1),
  apiKey: z.string().optional(),
  baseUrl: z.string().url().optional(),
  timeoutSeconds: z.number().int().positive().optional(),
});

export function serialiseAiConfig(config: AiConfig): string {
  return JSON.stringify(config);
}

export function deserialiseAiConfig(raw: string): AiConfig {
  return aiConfigSchema.parse(JSON.parse(raw));
}
