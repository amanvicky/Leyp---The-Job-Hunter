import { describe, expect, it } from "vitest";
import { readSession, signSession, fingerprintFor } from "./session-token";

const SECRET = "0123456789abcdef0123456789abcdef";
const PASSWORD_HASH = "argon2id:m=19456,t=2,p=1:c2FsdA:aGFzaA";

describe("session tokens", () => {
  it("round-trips a fresh token", async () => {
    const token = await signSession({ secret: SECRET, passwordHash: PASSWORD_HASH });
    const session = await readSession(token, { secret: SECRET, passwordHash: PASSWORD_HASH });
    expect(session?.fingerprint).toBe(fingerprintFor(PASSWORD_HASH));
    expect(session?.expiresAt).toBeGreaterThan(Date.now());
  });

  it("rejects a missing token", async () => {
    expect(await readSession(undefined, { secret: SECRET, passwordHash: PASSWORD_HASH })).toBeNull();
  });

  it("rejects a token signed with another secret", async () => {
    const token = await signSession({ secret: "ffffffffffffffffffffffffffffffff", passwordHash: PASSWORD_HASH });
    expect(await readSession(token, { secret: SECRET, passwordHash: PASSWORD_HASH })).toBeNull();
  });

  it("rejects a token after the password changes", async () => {
    const token = await signSession({ secret: SECRET, passwordHash: PASSWORD_HASH });
    const other = "argon2id:m=19456,t=2,p=1:ZGlmZg:b3RoZXI";
    expect(await readSession(token, { secret: SECRET, passwordHash: other })).toBeNull();
  });

  it("rejects a tampered token", async () => {
    const token = await signSession({ secret: SECRET, passwordHash: PASSWORD_HASH });
    const parts = token.split(".");
    parts[1] = `${parts[1]?.slice(0, -2)}xx`;
    expect(await readSession(parts.join("."), { secret: SECRET, passwordHash: PASSWORD_HASH })).toBeNull();
  });

  it("remembers longer when asked", async () => {
    const short = await signSession({ secret: SECRET, passwordHash: PASSWORD_HASH });
    const long = await signSession({ secret: SECRET, passwordHash: PASSWORD_HASH, remember: true });
    const a = await readSession(short, { secret: SECRET, passwordHash: PASSWORD_HASH });
    const b = await readSession(long, { secret: SECRET, passwordHash: PASSWORD_HASH });
    const day = 24 * 3600 * 1000;
    expect(a!.expiresAt - Date.now()).toBeLessThanOrEqual(day + 1000);
    expect(b!.expiresAt - Date.now()).toBeGreaterThan(20 * day);
  });
});
