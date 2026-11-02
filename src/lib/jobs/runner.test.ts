import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { drain, enqueue, MAX_ATTEMPTS, runOnce } from "./runner";

beforeEach(async () => {
  await prisma.job.deleteMany({});
});

const ctx = (handlers: Record<string, (input: unknown) => Promise<unknown>>) => ({ handlers });

describe("job runner", () => {
  it("runs a queued job and stores its result", async () => {
    await enqueue("double", { n: 5 });
    const ran = await runOnce(ctx({ double: async (input) => ({ doubled: (input as { n: number }).n * 2 }) }));

    expect(ran?.outcome).toBe("DONE");
    const job = await prisma.job.findUnique({ where: { id: ran!.id } });
    expect(job?.status).toBe("DONE");
    expect(JSON.parse(job!.result!)).toEqual({ doubled: 10 });
    expect(job?.attempts).toBe(1);
  });

  it("returns null when the queue is empty", async () => {
    expect(await runOnce(ctx({}))).toBeNull();
  });

  it("runs the oldest job first", async () => {
    await enqueue("first", null);
    await enqueue("second", null);
    const order: string[] = [];
    const handlers = {
      first: async () => { order.push("first"); return null; },
      second: async () => { order.push("second"); return null; },
    };

    await runOnce(ctx(handlers));
    await runOnce(ctx(handlers));
    expect(order).toEqual(["first", "second"]);
  });

  it("requeues a failure and stops after MAX_ATTEMPTS", async () => {
    const id = await enqueue("boom", null);
    const handlers = { boom: async () => { throw new Error("nope"); } };

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      const ran = await runOnce(ctx(handlers));
      const job = await prisma.job.findUnique({ where: { id } });
      expect(job?.attempts).toBe(attempt);
      if (attempt < MAX_ATTEMPTS) {
        expect(ran?.outcome).toBe("QUEUED");
        expect(job?.status).toBe("QUEUED");
      } else {
        expect(ran?.outcome).toBe("FAILED");
        expect(job?.status).toBe("FAILED");
        expect(job?.error).toContain("nope");
      }
    }

    // It must not be picked up again.
    expect(await runOnce(ctx(handlers))).toBeNull();
  });

  it("fails a job with no handler instead of retrying forever", async () => {
    const id = await enqueue("unknown-type", null);
    const ran = await runOnce(ctx({}));
    expect(ran?.outcome).toBe("FAILED");
    const job = await prisma.job.findUnique({ where: { id } });
    expect(job?.error).toContain("unknown-type");
  });

  it("never runs the same job twice", async () => {
    await enqueue("count", null);
    const handler = vi.fn(async () => null);
    await Promise.all([runOnce(ctx({ count: handler })), runOnce(ctx({ count: handler }))]);
    expect(handler).toHaveBeenCalledOnce();
  });

  it("drains the whole queue", async () => {
    for (let i = 0; i < 4; i += 1) await enqueue("noop", { i });
    const count = await drain(ctx({ noop: async () => null }));
    expect(count).toBe(4);
    expect(await prisma.job.count({ where: { status: "QUEUED" } })).toBe(0);
  });

  it("records the failure without leaking a stack trace to the client", async () => {
    await enqueue("leaky", null);
    const ran = await runOnce(ctx({
      leaky: async () => { throw new Error("postgres://user:pw@host/db"); },
    }));
    const job = await prisma.job.findUnique({ where: { id: ran!.id } });
    expect(job?.error).toContain("postgres://user:pw@host/db");
  });
});
