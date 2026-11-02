import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer, type Server } from "node:http";
import { loadProvider } from "../src/lib/ai";

/**
 * A real socket, a real HTTP exchange, a real AbortSignal.
 * Only the model's answers are faked; the transport is genuine.
 */
let server: Server;
let baseURL = "";
const received: { headers: Record<string, unknown>; body: unknown }[] = [];
let flakyHits = 0;

beforeAll(async () => {
  server = createServer((request, response) => {
    let raw = "";
    request.on("data", (chunk) => { raw += chunk; });
    request.on("end", () => {
      const body = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};

      if (request.url?.includes("slow")) {
        // Never answer: proves the timeout fires.
        return;
      }
      // Route by model, since every call uses the same chat path.
      const requestedModel = (body as { model?: string }).model;

      if (requestedModel === "flaky") {
        received.push({ headers: request.headers, body });
        flakyHits += 1;
        if (flakyHits === 1) {
          response.writeHead(429, { "content-type": "application/json" }).end("{}");
          return;
        }
        response.writeHead(200, { "content-type": "application/json" });
        response.end(JSON.stringify({ choices: [{ message: { content: "recovered" } }] }));
        return;
      }

      received.push({ headers: request.headers, body });
      const wantsJson = (body as { response_format?: unknown }).response_format !== undefined;
      const content = wantsJson
        ? JSON.stringify({ title: "Backend Engineer", company: "Acme" })
        : "plain answer";
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ choices: [{ message: { content } }] }));
    });
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (typeof address === "object" && address) baseURL = `http://127.0.0.1:${address.port}/v1`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe("provider over a real HTTP socket", () => {
  it("completes a chat call and returns the text", async () => {
    const provider = loadProvider({ provider: "openai", url: baseURL, model: "test-model", key: "secret-key" });
    await expect(provider.chat({ system: "be brief", user: "hello" })).resolves.toBe("plain answer");
  });

  it("sends the bearer token and the model name", async () => {
    const provider = loadProvider({ provider: "openai", url: baseURL, model: "test-model", key: "secret-key" });
    await provider.chat({ system: "s", user: "u" });
    const last = received.at(-1);
    expect(last?.headers["authorization"]).toBe("Bearer secret-key");
    expect((last?.body as { model?: string }).model).toBe("test-model");
  });

  it("returns JSON when a schema is requested and the server honours it", async () => {
    const provider = loadProvider({ provider: "openai", url: baseURL, model: "test-model" });
    const answer = await provider.chat({
      system: "s",
      user: "u",
      schema: { type: "object", properties: { title: { type: "string" } } },
    });
    expect(JSON.parse(answer)).toMatchObject({ title: "Backend Engineer" });
  });

  it("recovers from a 429 with a second request", async () => {
    const provider = loadProvider(
      { provider: "openai", url: baseURL, model: "flaky" },
      { sleep: async () => {} },
    );
    await expect(provider.chat({ system: "s", user: "u" })).resolves.toBe("recovered");
  });

  it("times out against a server that never answers", async () => {
    const provider = loadProvider(
      { provider: "openai", url: `${baseURL.replace("/v1", "")}/slow/v1`, model: "m", timeoutSeconds: 1 },
    );
    await expect(provider.chat({ system: "s", user: "u" })).rejects.toThrow(/took too long|could not be reached/i);
  });

  it("reports a dead port as unreachable", async () => {
    const provider = loadProvider({ provider: "openai", url: "http://127.0.0.1:1/v1", model: "m" });
    await expect(provider.chat({ system: "s", user: "u" })).rejects.toThrow(/could not be reached/i);
  });
});
