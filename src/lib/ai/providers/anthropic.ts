import { AiError, messageFor } from "../errors";
import type { ChatRequest, Provider, ProviderConfig, ProviderDeps } from "../types";

const RETRYABLE = new Set([429, 529]);
const ANTHROPIC_VERSION = "2023-06-01";

export function anthropicProvider(config: ProviderConfig, deps: ProviderDeps): Provider {
  const address = `${config.url.replace(/\/+$/, "")}/v1/messages`;
  const timeoutSeconds = config.timeoutSeconds ?? 120;

  async function once(request: ChatRequest): Promise<Response> {
    return deps.fetchImpl(address, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "anthropic-version": ANTHROPIC_VERSION,
        ...(config.key ? { "x-api-key": config.key } : {}),
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: request.maxTokens ?? 2048,
        system: request.system,
        messages: [{ role: "user", content: request.user }],
      }),
      signal: AbortSignal.timeout(timeoutSeconds * 1000),
    });
  }

  async function send(request: ChatRequest): Promise<Response> {
    try {
      const first = await once(request);
      if (!RETRYABLE.has(first.status)) return first;
      await deps.sleep(60_000);
      return await once(request);
    } catch (error) {
      if (error instanceof DOMException && error.name === "TimeoutError") {
        throw new AiError(`Anthropic took too long to answer (${timeoutSeconds}s).`, { cause: error });
      }
      throw new AiError("Anthropic could not be reached. Check the address in Settings.", { cause: error });
    }
  }

  return {
    name: "Anthropic",
    async chat(request: ChatRequest): Promise<string> {
      const response = await send(request);
      if (!response.ok) throw new AiError(messageFor(response.status, "Anthropic"));
      const body = (await response.json()) as { content?: { type: string; text?: string }[] };
      const text = body.content?.find((part) => part.type === "text")?.text;
      if (typeof text !== "string") throw new AiError("The model returned no text.");
      return text;
    },
  };
}
