import { describe, expect, it } from "vitest";
import { createProvider, serialiseAiConfig, deserialiseAiConfig } from "./config";

describe("ai config", () => {
  it("builds a provider from a config", () => {
    const provider = createProvider({ kind: "openai", model: "gpt-4o-mini", apiKey: "sk-test" });
    expect(provider.name).toBe("OpenAI-compatible");
  });

  it("round-trips a config through serialise/deserialise", () => {
    const config = { kind: "ollama" as const, model: "llama3.2", baseUrl: "http://localhost:11434/v1" };
    expect(deserialiseAiConfig(serialiseAiConfig(config)).model).toBe("llama3.2");
  });

  it("rejects an invalid config", () => {
    expect(() => deserialiseAiConfig(JSON.stringify({ kind: "nope", model: "" }))).toThrow();
  });
});
