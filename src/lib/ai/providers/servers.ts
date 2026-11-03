/**
 * Servers that speak OpenAI's chat API with a difference, recognised by address.
 * Vendor differences live here as data, so one adapter serves many vendors:
 * adding a backend is an entry in this table plus a test case.
 */
export type Server = {
  /** Who runs it, for tests and anyone reading. */
  name: string;
  /** Its domain; subdomains count too. */
  domain: string;
  /** The API's path, when people tend to enter another. */
  path?: (path: string) => string;
  /** Headers every request gets. */
  headers?: () => Record<string, string>;
  /** Fields every chat request gets on top of OpenAI's. */
  chat?: Record<string, unknown>;
  /** It accepts a JSON schema but does not hold answers to it: put the schema in the prompt. */
  ignoresSchemas?: true;
};

export const SERVERS: readonly Server[] = [
  {
    // Reasons before it answers unless told not to, and the reasoning counts
    // against max_tokens, so long answers ran out of room.
    name: "DeepSeek",
    domain: "deepseek.com",
    chat: { thinking: { type: "disabled" } },
  },
  {
    // Its API is at /api/v1; at /v1 its website answers with a 404 page.
    name: "OpenRouter",
    domain: "openrouter.ai",
    path: (path) => (/^(\/api|\/v1)?$/.test(path) ? "/api/v1" : path),
  },
  {
    // Accepts response_format but never shows the schema to the model.
    name: "Ollama Cloud",
    domain: "ollama.com",
    ignoresSchemas: true,
  },
];

export function serverAt(baseURL: string): Server | undefined {
  const host = URL.canParse(baseURL) ? new URL(baseURL).hostname : "";
  return SERVERS.find(({ domain }) => host === domain || host.endsWith(`.${domain}`));
}

export function withoutSlashes(text: string): string {
  let end = text.length;
  while (end > 0 && text[end - 1] === "/") end--;
  return text.slice(0, end);
}

/** `baseURL` with the path its server's API is at; other addresses unchanged. */
export function apiAddress(baseURL: string): string {
  const shape = serverAt(baseURL)?.path;
  if (!shape) return withoutSlashes(baseURL);
  let url: URL;
  try {
    url = new URL(baseURL);
  } catch {
    return baseURL;
  }
  url.pathname = shape(withoutSlashes(url.pathname));
  return withoutSlashes(url.href);
}

/** Whether answers need the JSON schema in the prompt rather than in response_format. */
export function ignoresSchemas(baseURL: string, model: string): boolean {
  return serverAt(baseURL)?.ignoresSchemas === true || model.endsWith("-cloud");
}

