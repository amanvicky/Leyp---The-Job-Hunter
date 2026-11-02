import { hash, verify } from "@node-rs/argon2";

const PARAMS = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

/**
 * Hash a password with argon2id at OWASP's settings.
 *
 * The stored form is `argon2id:m=<m>,t=<t>,p=<p>:<salt>:<hash>` rather than the
 * conventional `$argon2id$v=19$...` string, because environment-file parsers
 * expand `$` and would corrupt it.
 */
export async function hashPassword(plain: string): Promise<string> {
  const encoded = await hash(plain, { ...PARAMS, outputLen: 32 });
  const parts = encoded.split("$");
  const params = parts[3] ?? "";
  const salt = parts[4] ?? "";
  const digest = parts[5] ?? "";
  const m = /m=(\d+)/.exec(params)?.[1] ?? String(PARAMS.memoryCost);
  const t = /t=(\d+)/.exec(params)?.[1] ?? String(PARAMS.timeCost);
  const p = /p=(\d+)/.exec(params)?.[1] ?? String(PARAMS.parallelism);
  return `argon2id:m=${m},t=${t},p=${p}:${salt}:${digest}`;
}

/** Check a password against a stored hash. Returns false for a malformed hash. */
export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  const [scheme, params, salt, digest] = stored.split(":");
  if (scheme !== "argon2id" || !params || !salt || !digest) return false;
  const m = /m=(\d+)/.exec(params)?.[1];
  const t = /t=(\d+)/.exec(params)?.[1];
  const p = /p=(\d+)/.exec(params)?.[1];
  if (!m || !t || !p) return false;
  const encoded = `$argon2id$v=19$m=${m},t=${t},p=${p}$${salt}$${digest}`;
  try {
    return await verify(encoded, plain);
  } catch {
    return false;
  }
}
