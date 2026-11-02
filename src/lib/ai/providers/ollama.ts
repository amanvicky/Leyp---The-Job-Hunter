import { openAiProvider } from "./openai";
import type { Provider, ProviderConfig, ProviderDeps } from "../types";

const DEFAULT_URL = "http://localhost:11434/v1";

/** Ollama serves an OpenAI-compatible endpoint, needs no key, and is slower. */
export function ollamaProvider(config: ProviderConfig, deps: ProviderDeps): Provider {
  const provider = openAiProvider(
    {
      ...config,
      url: config.url || DEFAULT_URL,
      timeoutSeconds: config.timeoutSeconds ?? 300,
    },
    deps,
  );
  return { ...provider, name: "Ollama" };
}
