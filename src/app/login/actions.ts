"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ActionError } from "@/lib/action";
import { verifyPassword } from "@/lib/auth/password-hash";
import { createSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";
import { checkThrottle, clearFailures, recordFailure } from "@/lib/auth/throttle";
import { getEnv } from "@/env";

const schema = z.object({
  password: z.string().min(1, "Enter your password."),
  remember: z.boolean().optional(),
});

export type SignInInput = z.infer<typeof schema>;

/**
 * Sign-in is the one action that must run without a session, so it uses the
 * core wrapper with its own dependency instead of `serverAction`.
 */
export async function signIn(input: SignInInput): Promise<{ ok: boolean; error?: string }> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Enter your password." };
  }

  const key = await clientKey();
  const throttle = await checkThrottle(key);
  if (throttle.blocked) {
    const seconds = Math.ceil(throttle.retryAfterMs / 1000);
    return { ok: false, error: `Too many attempts. Try again in ${seconds} seconds.` };
  }

  const env = getEnv();
  if (!(await verifyPassword(parsed.data.password, env.APP_PASSWORD))) {
    await recordFailure(key);
    return { ok: false, error: "That password is not right." };
  }

  await clearFailures(key);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, await createSession(parsed.data.remember ?? false), sessionCookieOptions(parsed.data.remember ?? false));
  redirect("/");
}

export async function clientKey(): Promise<string> {
  const store = await headers();
  const forwarded = store.get("x-forwarded-for");
  const last = forwarded?.split(",").at(-1)?.trim();
  return last || "local";
}

// Keep ActionError importable for callers that want the same message shape.
export { ActionError };
