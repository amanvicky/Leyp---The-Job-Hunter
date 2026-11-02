import { z } from "zod";

export class EnvError extends Error {}

const HASH = /^argon2id:m=\d+,t=\d+,p=\d+:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/;

const schema = z.object({
  APP_PASSWORD: z.string().regex(HASH, "APP_PASSWORD must be an argon2id hash, not a password"),
  APP_SECRET: z.string().min(32, "APP_SECRET must be at least 32 characters"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  AI_TIMEOUT_SECONDS: z.coerce.number().int().positive().optional(),
  TEST_DATABASE_URL: z.string().optional(),
  E2E_DATABASE_URL: z.string().optional(),
});

export type Env = z.infer<typeof schema>;

export function loadEnv(source: Record<string, string | undefined>): Env {
  const result = schema.safeParse(source);
  if (!result.success) {
    const first = result.error.issues[0];
    const name = String(first?.path[0] ?? "environment");
    throw new EnvError(`${name}: ${first?.message ?? "is invalid"}`);
  }
  return result.data;
}

let cached: Env | undefined;

/**
 * The process environment, validated on first use.
 * Deliberately lazy: a module that only needs `loadEnv` must not crash on import
 * when configuration is absent (tests, tooling, build steps).
 */
export function getEnv(): Env {
  if (!cached) cached = loadEnv(process.env);
  return cached;
}
