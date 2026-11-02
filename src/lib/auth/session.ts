import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getEnv } from "@/env";
import { readSession, signSession, type Session } from "./session-token";

export const SESSION_COOKIE = "leyp_session";

export type { Session };

export async function createSession(remember = false): Promise<string> {
  const env = getEnv();
  return signSession({ secret: env.APP_SECRET, passwordHash: env.APP_PASSWORD, remember });
}

export async function getSession(): Promise<Session | null> {
  const env = getEnv();
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return readSession(token, { secret: env.APP_SECRET, passwordHash: env.APP_PASSWORD });
}

/** For pages and layouts: sends the visitor to the sign-in screen when unauthenticated. */
export async function verifySession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export function sessionCookieOptions(remember: boolean): {
  httpOnly: true;
  sameSite: "lax";
  secure: boolean;
  path: "/";
  maxAge: number;
} {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: getEnv().NODE_ENV === "production",
    path: "/",
    maxAge: remember ? 30 * 24 * 3600 : 24 * 3600,
  };
}
