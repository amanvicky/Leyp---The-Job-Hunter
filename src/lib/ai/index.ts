import { anthropicProvider } from "./providers/anthropic";
import { mistralProvider } from "./providers/mistral";
import { ollamaProvider } from "./providers/ollama";
import { openAiProvider } from "./providers/openai";
import type { Provider, ProviderConfig, ProviderDeps } from "./types";

/**
 * Build the provider described by `config`.
 *
 * The choice is a runtime value, so every adapter is present from the start and
 * switching backends is a settings change, never a code change.
 */
export function loadProvider(
  config: ProviderConfig,
  deps: Partial<ProviderDeps> = {},
): Provider {
  const resolved: ProviderDeps = {
    fetchImpl: deps.fetchImpl ?? fetch,
    sleep: deps.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))),
  };

  switch (config.provider) {
    case "anthropic":
      return anthropicProvider(config, resolved);
    case "mistral":
      return mistralProvider(config, resolved);
    case "local":
      return ollamaProvider(config, resolved);
    case "lmstudio":
    case "openai":
    default:
      return openAiProvider(config, resolved);
  }
}

export { AiError, messageFor } from "./errors";
export type { ChatRequest, Provider, ProviderConfig, ProviderKind } from "./types";
