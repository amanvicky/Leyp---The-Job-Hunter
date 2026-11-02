import { prisma } from "@/lib/prisma";

/** Failures inside one window accumulate; outside it the count starts again. */
export const WINDOW_MS = 15 * 60_000;
/** Attempts allowed before a block. */
export const LIMIT = 5;
const BASE_BACKOFF_MS = 30_000;
const MAX_BACKOFF_MS = 15 * 60_000;

export type ThrottleState = { blocked: boolean; retryAfterMs: number };

const GLOBAL_KEY = "*";

export function backoffFor(failures: number): number {
  if (failures < LIMIT) return 0;
  const step = failures - LIMIT;
  return Math.min(BASE_BACKOFF_MS * 2 ** step, MAX_BACKOFF_MS);
}

/** Ask whether this client (and everyone) may try to sign in now. */
export async function checkThrottle(key: string, now = new Date()): Promise<ThrottleState> {
  const rows = await prisma.loginThrottle.findMany({ where: { key: { in: [key, GLOBAL_KEY] } } });
  let retryAfterMs = 0;
  for (const row of rows) {
    if (row.blockedUntil && row.blockedUntil > now) {
      retryAfterMs = Math.max(retryAfterMs, row.blockedUntil.getTime() - now.getTime());
    }
  }
  return { blocked: retryAfterMs > 0, retryAfterMs };
}

/** Count a failed attempt against both this client and everyone. */
export async function recordFailure(key: string, now = new Date()): Promise<void> {
  for (const k of [key, GLOBAL_KEY]) {
    const row = await prisma.loginThrottle.findUnique({ where: { key: k } });
    const fresh = !row || now.getTime() - row.windowStart.getTime() > WINDOW_MS;
    const failures = fresh ? 1 : row.failures + 1;
    const backoff = backoffFor(failures);
    const blockedUntil = backoff > 0 ? new Date(now.getTime() + backoff) : null;
    await prisma.loginThrottle.upsert({
      where: { key: k },
      create: { key: k, failures, windowStart: now, blockedUntil },
      update: { failures, windowStart: fresh ? now : row.windowStart, blockedUntil },
    });
  }
}

/** A good password clears this client's record. The global counter decays on its own. */
export async function clearFailures(key: string): Promise<void> {
  await prisma.loginThrottle.deleteMany({ where: { key } });
}

export async function resetThrottle(): Promise<void> {
  await prisma.loginThrottle.deleteMany({});
}
