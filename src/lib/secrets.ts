import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

/** Each class of secret gets its own derived key, so one leak cannot open another. */
export type SecretClass = "AI_KEY" | "JOB_SOURCE_KEY" | "GOOGLE_TOKEN";

function key(secret: string, cls: SecretClass): Buffer {
  return Buffer.from(hkdfSync("sha256", secret, "leyp", `secret:${cls}`, 32));
}

/** AES-256-GCM. Output is base64 of iv(12) || tag(16) || ciphertext. */
export function encrypt(plaintext: string, cls: SecretClass, secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(secret, cls), iv);
  const body = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, body]).toString("base64");
}

export function decrypt(payload: string, cls: SecretClass, secret: string): string {
  const raw = Buffer.from(payload, "base64");
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const body = raw.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key(secret, cls), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(body), decipher.final()]).toString("utf8");
}
