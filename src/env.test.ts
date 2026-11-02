import { describe, expect, it } from "vitest";
import { loadEnv, EnvError } from "./env";

const valid = {
  APP_PASSWORD: "argon2id:m=19456,t=2,p=1:c2FsdA:aGFzaA",
  APP_SECRET: "0123456789abcdef0123456789abcdef",
  DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/leyp",
  NODE_ENV: "test",
};

describe("loadEnv", () => {
  it("accepts a valid environment", () => {
    const env = loadEnv(valid);
    expect(env.DATABASE_URL).toBe(valid.DATABASE_URL);
    expect(env.APP_SECRET.length).toBe(32);
  });

  it("rejects a password that is not a hash", () => {
    expect(() => loadEnv({ ...valid, APP_PASSWORD: "hunter2" })).toThrow(EnvError);
    expect(() => loadEnv({ ...valid, APP_PASSWORD: "hunter2" })).toThrow(/must be an argon2id hash/);
  });

  it("rejects a secret shorter than 32 characters", () => {
    expect(() => loadEnv({ ...valid, APP_SECRET: "short" })).toThrow(/at least 32 characters/);
  });

  it("names the first missing variable", () => {
    const { DATABASE_URL: _omit, ...rest } = valid;
    expect(() => loadEnv(rest)).toThrow(/DATABASE_URL/);
  });
});
