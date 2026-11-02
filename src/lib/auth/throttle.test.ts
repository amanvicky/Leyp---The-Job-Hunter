import { beforeEach, describe, expect, it } from "vitest";
import { backoffFor, checkThrottle, clearFailures, LIMIT, recordFailure, resetThrottle } from "./throttle";

beforeEach(async () => {
  await resetThrottle();
});

describe("backoffFor", () => {
  it("is zero before the limit", () => {
    expect(backoffFor(1)).toBe(0);
    expect(backoffFor(LIMIT - 1)).toBe(0);
  });

  it("doubles from the limit and caps at fifteen minutes", () => {
    expect(backoffFor(LIMIT)).toBe(30_000);
    expect(backoffFor(LIMIT + 1)).toBe(60_000);
    expect(backoffFor(LIMIT + 2)).toBe(120_000);
    expect(backoffFor(99)).toBe(15 * 60_000);
  });
});

describe("throttle", () => {
  it("allows attempts before the limit", async () => {
    for (let i = 0; i < LIMIT - 1; i += 1) await recordFailure("1.2.3.4");
    expect((await checkThrottle("1.2.3.4")).blocked).toBe(false);
  });

  it("blocks at the limit", async () => {
    for (let i = 0; i < LIMIT; i += 1) await recordFailure("1.2.3.4");
    const state = await checkThrottle("1.2.3.4");
    expect(state.blocked).toBe(true);
    expect(state.retryAfterMs).toBeGreaterThan(0);
  });

  it("blocks everyone, not just the offending client", async () => {
    for (let i = 0; i < LIMIT; i += 1) await recordFailure("1.2.3.4");
    expect((await checkThrottle("9.9.9.9")).blocked).toBe(true);
  });

  it("forgets a client after a successful sign-in", async () => {
    await recordFailure("1.2.3.4");
    await recordFailure("1.2.3.4");
    await clearFailures("1.2.3.4");
    expect((await checkThrottle("1.2.3.4")).blocked).toBe(false);
  });

  it("starts a new window once the old one has passed", async () => {
    const start = new Date("2026-01-01T00:00:00Z");
    for (let i = 0; i < LIMIT; i += 1) await recordFailure("1.2.3.4", start);
    const later = new Date(start.getTime() + 16 * 60_000);
    await recordFailure("1.2.3.4", later);
    const row = await (await import("@/lib/prisma")).prisma.loginThrottle.findUnique({
      where: { key: "1.2.3.4" },
    });
    expect(row?.failures).toBe(1);
  });

  it("lifts the block when the backoff has expired", async () => {
    const start = new Date("2026-01-01T00:00:00Z");
    for (let i = 0; i < LIMIT; i += 1) await recordFailure("1.2.3.4", start);
    const after = new Date(start.getTime() + 31_000);
    expect((await checkThrottle("1.2.3.4", after)).blocked).toBe(false);
  });
});
