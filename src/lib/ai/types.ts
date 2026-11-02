export type ChatRequest = {
  system: string;
  user: string;
  schema?: object;
  maxTokens?: number;
};

export type Provider = {
  name: string;
  chat(request: ChatRequest): Promise<string>;
};

export type ProviderKind = "local" | "openai" | "anthropic" | "mistral" | "lmstudio";

export type ProviderConfig = {
  provider: ProviderKind;
  url: string;
  model: string;
  key?: string;
  /** Seconds before the call is abandoned. Defaults: 300 local, 120 hosted. */
  timeoutSeconds?: number;
};

export type ProviderDeps = {
  fetchImpl: typeof fetch;
  sleep: (ms: number) => Promise<void>;
};
