import { SignJWT, jwtVerify } from "jose";
import { createHash } from "node:crypto";

export type Session = { fingerprint: string; expiresAt: number };

const ALGORITHM = "HS256";

/** The session key is derived from APP_SECRET, never the secret itself. */
export function signingKey(secret: string): Uint8Array {
  return new Uint8Array(createHash("sha256").update(`session:${secret}`).digest());
}

/**
 * Ties a session to the current password. Changing the password changes the
 * fingerprint, so every existing session stops verifying.
 */
export function fingerprintFor(passwordHash: string): string {
  return createHash("sha256").update(passwordHash).digest("base64url").slice(0, 16);
}

export async function signSession(
  options: { secret: string; passwordHash: string; remember?: boolean; now?: number },
): Promise<string> {
  const seconds = options.remember ? 30 * 24 * 3600 : 24 * 3600;
  return new SignJWT({ fingerprint: fingerprintFor(options.passwordHash) })
    .setProtectedHeader({ alg: ALGORITHM })
    .setIssuedAt()
    .setExpirationTime(`${seconds}s`)
    .sign(signingKey(options.secret));
}

/** Returns null for a missing, malformed, expired or stale token. */
export async function readSession(
  token: string | undefined,
  options: { secret: string; passwordHash: string },
): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, signingKey(options.secret));
    if (payload.fingerprint !== fingerprintFor(options.passwordHash)) return null;
    const expiresAt = Number(payload.exp) * 1000;
    if (!Number.isFinite(expiresAt)) return null;
    return { fingerprint: String(payload.fingerprint), expiresAt };
  } catch {
    return null;
  }
}
