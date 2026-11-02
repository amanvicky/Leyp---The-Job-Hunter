import { openAiProvider } from "./openai";
import type { Provider, ProviderConfig, ProviderDeps } from "../types";

/** Mistral speaks the OpenAI chat API, so it reuses that adapter. */
export function mistralProvider(config: ProviderConfig, deps: ProviderDeps): Provider {
  const provider = openAiProvider(
    { ...config, url: config.url.replace(/\/+$/, "") || "https://api.mistral.ai" },
    deps,
  );
  return { ...provider, name: "Mistral" };
}
