import { prisma } from "@/lib/prisma";

export type JobStatus = "QUEUED" | "RUNNING" | "DONE" | "FAILED";

export type JobHandler = (input: unknown, job: { id: string; step: string | null }) => Promise<unknown>;

export type JobContext = {
  handlers: Record<string, JobHandler>;
  onStep?: (jobId: string, step: string) => Promise<void>;
  now?: () => Date;
};

/** Give up after this many attempts so one broken job cannot spin forever. */
export const MAX_ATTEMPTS = 3;

export async function enqueue(
  type: string,
  input: unknown,
  options: { key?: string; applicationId?: string } = {},
): Promise<string> {
  const job = await prisma.job.create({
    data: {
      type,
      input: JSON.stringify(input ?? null),
      key: options.key ?? null,
      applicationId: options.applicationId ?? null,
    },
  });
  return job.id;
}

/**
 * Claim the oldest queued job and run it.
 *
 * Returns null when the queue is empty. A job that has already failed
 * MAX_ATTEMPTS times is marked FAILED instead of being retried again.
 */
export async function runOnce(context: JobContext): Promise<{ id: string; outcome: JobStatus } | null> {
  const now = context.now ?? (() => new Date());

  const next = await prisma.job.findFirst({
    where: { status: "QUEUED" },
    orderBy: { createdAt: "asc" },
  });
  if (!next) return null;

  // Claim it first: two runners must not pick up the same row.
  const claimed = await prisma.job.updateMany({
    where: { id: next.id, status: "QUEUED" },
    data: { status: "RUNNING", startedAt: now(), attempts: { increment: 1 } },
  });
  if (claimed.count === 0) return null;

  const handler = context.handlers[next.type];
  if (!handler) {
    await prisma.job.update({
      where: { id: next.id },
      data: { status: "FAILED", error: `No handler for "${next.type}".`, finishedAt: now() },
    });
    return { id: next.id, outcome: "FAILED" };
  }

  try {
    const result = await handler(JSON.parse(next.input), { id: next.id, step: next.step });
    await prisma.job.update({
      where: { id: next.id },
      data: {
        status: "DONE",
        result: result === undefined ? null : JSON.stringify(result),
        error: null,
        finishedAt: now(),
      },
    });
    return { id: next.id, outcome: "DONE" };
  } catch (error) {
    const attempts = next.attempts + 1;
    const exhausted = attempts >= MAX_ATTEMPTS;
    await prisma.job.update({
      where: { id: next.id },
      data: {
        status: exhausted ? "FAILED" : "QUEUED",
        error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
        finishedAt: exhausted ? now() : null,
      },
    });
    return { id: next.id, outcome: exhausted ? "FAILED" : "QUEUED" };
  }
}

/** Run until the queue is empty, up to `limit` jobs. */
export async function drain(context: JobContext, limit = 50): Promise<number> {
  let count = 0;
  while (count < limit) {
    const ran = await runOnce(context);
    if (!ran) break;
    count += 1;
  }
  return count;
}
