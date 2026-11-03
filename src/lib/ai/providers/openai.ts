import { AiError, messageFor } from "../errors";
import { apiAddress, ignoresSchemas, serverAt } from "./servers";
import type { ChatRequest, Provider, ProviderConfig, ProviderDeps } from "../types";

const RETRYABLE = new Set([429, 529]);

export function openAiProvider(config: ProviderConfig, deps: ProviderDeps): Provider {
  const server = serverAt(config.url);
  const address = `${apiAddress(config.url)}/chat/completions`;
  const putSchemaInPrompt = ignoresSchemas(config.url, config.model);
  const timeoutSeconds = config.timeoutSeconds ?? (server ? 120 : 300);
  const label = server?.name ?? "The model";

  async function once(request: ChatRequest): Promise<Response> {
    const system =
      putSchemaInPrompt && request.schema
        ? `${request.system}\n\nAnswer with JSON matching this schema:\n${JSON.stringify(request.schema)}`
        : request.system;

    return deps.fetchImpl(address, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(config.key ? { authorization: `Bearer ${config.key}` } : {}),
        ...(server?.headers?.() ?? {}),
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: request.user },
        ],
        max_tokens: request.maxTokens ?? 2048,
        ...(request.schema && !putSchemaInPrompt
          ? { response_format: { type: "json_schema", json_schema: request.schema } }
          : {}),
        ...(server?.chat ?? {}),
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
        throw new AiError(
          `${label} took too long to answer (${timeoutSeconds}s). Try a smaller model or a shorter posting.`,
          { cause: error },
        );
      }
      throw new AiError(`${label} could not be reached. Check the address in Settings.`, { cause: error });
    }
  }

  return {
    name: server?.name ?? "OpenAI-compatible",
    async chat(request: ChatRequest): Promise<string> {
      const response = await send(request);
      if (!response.ok) throw new AiError(messageFor(response.status, label));
      const body = (await response.json()) as { choices?: { message?: { content?: string } }[] };
      const text = body.choices?.[0]?.message?.content;
      if (typeof text !== "string") throw new AiError("The model returned no text.");
      return text;
    },
  };
}