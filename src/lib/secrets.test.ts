import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./auth/password-hash";
import { decrypt, encrypt } from "./secrets";

const SECRET = "0123456789abcdef0123456789abcdef";

describe("password hashing", () => {
  it("verifies the right password and rejects the wrong one", async () => {
    const stored = await hashPassword("correct horse");
    expect(stored.startsWith("argon2id:m=19456,t=2,p=1:")).toBe(true);
    expect(await verifyPassword("correct horse", stored)).toBe(true);
    expect(await verifyPassword("wrong", stored)).toBe(false);
  });

  it("never stores the plaintext", async () => {
    const stored = await hashPassword("correct horse");
    expect(stored).not.toContain("correct horse");
  });

  it("rejects a malformed hash instead of throwing", async () => {
    expect(await verifyPassword("x", "not-a-hash")).toBe(false);
    expect(await verifyPassword("x", "argon2id:m=1,t=2")).toBe(false);
  });

  it("produces a different hash each time (unique salt)", async () => {
    const a = await hashPassword("same");
    const b = await hashPassword("same");
    expect(a).not.toBe(b);
    expect(await verifyPassword("same", a)).toBe(true);
    expect(await verifyPassword("same", b)).toBe(true);
  });
});

describe("secret encryption", () => {
  it("round-trips a value", () => {
    const sealed = encrypt("sk-live-abc123", "AI_KEY", SECRET);
    expect(sealed).not.toContain("sk-live-abc123");
    expect(decrypt(sealed, "AI_KEY", SECRET)).toBe("sk-live-abc123");
  });

  it("will not decrypt under a different class", () => {
    const sealed = encrypt("sk-live-abc123", "AI_KEY", SECRET);
    expect(() => decrypt(sealed, "JOB_SOURCE_KEY", SECRET)).toThrow();
  });

  it("will not decrypt under a different secret", () => {
    const sealed = encrypt("sk-live-abc123", "AI_KEY", SECRET);
    expect(() => decrypt(sealed, "AI_KEY", "ffffffffffffffffffffffffffffffff")).toThrow();
  });

  it("produces a different ciphertext each time (unique iv)", () => {
    const a = encrypt("same", "AI_KEY", SECRET);
    const b = encrypt("same", "AI_KEY", SECRET);
    expect(a).not.toBe(b);
  });
});
