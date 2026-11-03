import { prisma } from "@/lib/prisma";

export type SourceResult<T> = { ok: true; data: T } | { ok: false; error: string; quota?: boolean };

export type CachedSearch = { postings: unknown[]; next?: string; found: number };

export async function getCachedSearch(source: string, query: string): Promise<CachedSearch | null> {
  const row = await prisma.postingSearch.findFirst({
    where: { source, query },
    orderBy: { createdAt: "desc" },
  });
  if (!row) return null;
  // 30-minute cache.
  const age = Date.now() - row.updatedAt.getTime();
  if (age > 30 * 60 * 1000) return null;
  return { postings: JSON.parse(row.postings), next: row.next ?? undefined, found: row.found };
}

export async function setCachedSearch(source: string, query: string, data: CachedSearch): Promise<void> {
  await prisma.postingSearch.create({
    data: {
      source,
      query,
      postings: JSON.stringify(data.postings),
      found: data.found,
      next: data.next ?? null,
    },
  });
}

export function quotaError(source: string): string {
  return `${source} rate limit reached. Try again later.`;
}