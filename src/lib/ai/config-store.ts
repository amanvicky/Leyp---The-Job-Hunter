import { getSetting, setSetting } from "@/lib/settings";
import { aiConfigSchema, type AiConfig, createProvider } from "@/lib/ai/config";
import type { Provider } from "@/lib/ai/types";

const KEY = "ai";

export async function loadAiConfig(): Promise<AiConfig | null> {
  const raw = await getSetting(KEY);
  if (!raw) return null;
  try {
    return aiConfigSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

export async function saveAiConfig(config: AiConfig): Promise<void> {
  await setSetting(KEY, JSON.stringify(config));
}

export async function loadProviderFromSettings(): Promise<Provider | null> {
  const config = await loadAiConfig();
  if (!config) return null;
  return createProvider(config);
}
