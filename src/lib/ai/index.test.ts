import { describe, expect, it, vi } from "vitest";
import { loadProvider } from "./index";
import { AiError } from "./errors";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function fakeFetch(body: unknown, status = 200) {
  return vi.fn(async (..._args: Parameters<typeof fetch>) => jsonResponse(body, status));
}

const DEEPSEEK = {
  provider: "openai" as const,
  url: "https://api.deepseek.com/v1",
  model: "deepseek-chat",
  key: "k",
};

describe("loadProvider", () => {
  it("returns text from an OpenAI-compatible server", async () => {
    const fetchImpl = fakeFetch({ choices: [{ message: { content: "hello" } }] });
    const provider = loadProvider(DEEPSEEK, { fetchImpl });
    await expect(provider.chat({ system: "s", user: "u" })).resolves.toBe("hello");
  });

  it("sends the DeepSeek thinking override", async () => {
    const fetchImpl = fakeFetch({ choices: [{ message: { content: "hi" } }] });
    const provider = loadProvider(DEEPSEEK, { fetchImpl });
    await provider.chat({ system: "s", user: "u" });
    const init = fetchImpl.mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(String(init.body)) as { thinking?: unknown };
    expect(body.thinking).toEqual({ type: "disabled" });
  });

  it("puts the schema in the prompt for a server that ignores schemas", async () => {
    const fetchImpl = fakeFetch({ choices: [{ message: { content: "{}" } }] });
    const provider = loadProvider(
      { provider: "openai", url: "https://ollama.com/v1", model: "gpt-oss:120b" },
      { fetchImpl },
    );
    await provider.chat({ system: "base", user: "u", schema: { type: "object" } });
    const init = fetchImpl.mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(String(init.body)) as {
      messages: { role: string; content: string }[];
      response_format?: unknown;
    };
    expect(body.messages[0]?.content).toContain("Answer with JSON matching this schema");
    expect(body.response_format).toBeUndefined();
  });

  it("uses response_format for a server that honours schemas", async () => {
    const fetchImpl = fakeFetch({ choices: [{ message: { content: "{}" } }] });
    const provider = loadProvider(DEEPSEEK, { fetchImpl });
    await provider.chat({ system: "s", user: "u", schema: { type: "object" } });
    const init = fetchImpl.mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(String(init.body)) as { response_format?: { type: string } };
    expect(body.response_format?.type).toBe("json_schema");
  });

  it("turns a 401 into a readable AiError", async () => {
    const fetchImpl = fakeFetch({ error: "bad key" }, 401);
    const provider = loadProvider(DEEPSEEK, { fetchImpl });
    await expect(provider.chat({ system: "s", user: "u" })).rejects.toBeInstanceOf(AiError);
    await expect(provider.chat({ system: "s", user: "u" })).rejects.toThrow(/key was rejected/i);
  });

  it("retries once on 429", async () => {
    let calls = 0;
    const fetchImpl = vi.fn(async () => {
      calls += 1;
      return calls === 1
        ? new Response("{}", { status: 429 })
        : jsonResponse({ choices: [{ message: { content: "ok" } }] });
    });
    const provider = loadProvider(DEEPSEEK, { fetchImpl, sleep: async () => {} });
    await expect(provider.chat({ system: "s", user: "u" })).resolves.toBe("ok");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("gives up when the model takes too long", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new DOMException("The operation timed out.", "TimeoutError");
    });
    const provider = loadProvider(
      { ...DEEPSEEK, timeoutSeconds: 1 },
      { fetchImpl, sleep: async () => {} },
    );
    await expect(provider.chat({ system: "s", user: "u" })).rejects.toThrow(/took too long/i);
  });

  it("reports an unreachable server in plain words", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("fetch failed");
    });
    const provider = loadProvider(DEEPSEEK, { fetchImpl });
    await expect(provider.chat({ system: "s", user: "u" })).rejects.toThrow(/could not be reached/i);
  });

  it("passes a timeout signal to fetch", async () => {
    const fetchImpl = fakeFetch({ choices: [{ message: { content: "x" } }] });
    const provider = loadProvider({ ...DEEPSEEK, timeoutSeconds: 5 }, { fetchImpl });
    await provider.chat({ system: "s", user: "u" });
    const init = fetchImpl.mock.calls[0]?.[1] as RequestInit;
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("reads Anthropic's content blocks", async () => {
    const fetchImpl = fakeFetch({
      content: [{ type: "text", text: "from claude" }],
    });
    const provider = loadProvider(
      { provider: "anthropic", url: "https://api.anthropic.com", model: "claude-haiku-4-5", key: "k" },
      { fetchImpl },
    );
    await expect(provider.chat({ system: "s", user: "u" })).resolves.toBe("from claude");
  });

  it("sends Anthropic's required headers", async () => {
    const fetchImpl = fakeFetch({ content: [{ type: "text", text: "x" }] });
    const provider = loadProvider(
      { provider: "anthropic", url: "https://api.anthropic.com", model: "m", key: "secret" },
      { fetchImpl },
    );
    await provider.chat({ system: "s", user: "u" });
    const init = fetchImpl.mock.calls[0]?.[1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers["anthropic-version"]).toBe("2023-06-01");
    expect(headers["x-api-key"]).toBe("secret");
  });

  it("defaults a local provider to Ollama's address", async () => {
    const fetchImpl = fakeFetch({ choices: [{ message: { content: "local" } }] });
    const provider = loadProvider(
      { provider: "local", url: "", model: "qwen2.5:3b" },
      { fetchImpl },
    );
    await expect(provider.chat({ system: "s", user: "u" })).resolves.toBe("local");
    expect(String(fetchImpl.mock.calls[0]?.[0])).toContain("localhost:11434");
  });
});
