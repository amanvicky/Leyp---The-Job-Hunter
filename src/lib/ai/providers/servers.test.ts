import { describe, expect, it } from "vitest";
import { apiAddress, ignoresSchemas, serverAt } from "./servers";

describe("serverAt", () => {
  it("matches a known domain and its subdomains", () => {
    expect(serverAt("https://deepseek.com/v1")?.name).toBe("DeepSeek");
    expect(serverAt("https://api.deepseek.com/v1")?.name).toBe("DeepSeek");
  });

  it("returns undefined for an unknown host", () => {
    expect(serverAt("http://localhost:11434")).toBeUndefined();
  });

  it("is not confused by a malformed address", () => {
    expect(serverAt("not a url")).toBeUndefined();
  });
});

describe("apiAddress", () => {
  it("moves OpenRouter to /api/v1", () => {
    expect(apiAddress("https://openrouter.ai/v1")).toBe("https://openrouter.ai/api/v1");
    expect(apiAddress("https://openrouter.ai")).toBe("https://openrouter.ai/api/v1");
  });

  it("keeps a deeper OpenRouter path", () => {
    expect(apiAddress("https://openrouter.ai/custom")).toBe("https://openrouter.ai/custom");
  });

  it("leaves an unknown server alone and strips trailing slashes", () => {
    expect(apiAddress("http://localhost:1234/v1")).toBe("http://localhost:1234/v1");
    expect(apiAddress("http://localhost:1234/v1///")).toBe("http://localhost:1234/v1");
  });
});

describe("ignoresSchemas", () => {
  it("is true for Ollama Cloud and -cloud models", () => {
    expect(ignoresSchemas("https://ollama.com/v1", "gpt-oss:120b")).toBe(true);
    expect(ignoresSchemas("http://localhost:11434/v1", "gpt-oss:120b-cloud")).toBe(true);
    expect(ignoresSchemas("http://localhost:11434/v1", "qwen2.5:3b")).toBe(false);
  });
});
