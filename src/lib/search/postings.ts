import { prisma } from "@/lib/prisma";

export async function upsertPosting(input: {
  source: string;
  externalId: string;
  title?: string;
  company?: string;
  place?: string;
  remote?: boolean | null;
  salary?: string;
  salaryMin?: number | null;
  salaryMax?: number | null;
  currency?: string;
  postedAt?: string | null;
  url?: string;
  via?: string;
  description?: string;
  complete?: boolean;
}) {
  return prisma.posting.upsert({
    where: { source_externalId: { source: input.source, externalId: input.externalId } },
    create: {
      source: input.source,
      externalId: input.externalId,
      title: input.title ?? "",
      company: input.company ?? "",
      place: input.place ?? "",
      remote: input.remote ?? null,
      salary: input.salary ?? "",
      salaryMin: input.salaryMin ?? null,
      salaryMax: input.salaryMax ?? null,
      currency: input.currency ?? "INR",
      postedAt: input.postedAt ? new Date(input.postedAt) : null,
      url: input.url ?? "",
      via: input.via ?? "",
      description: input.description ?? "",
      complete: input.complete ?? false,
    },
    update: {
      title: input.title ?? undefined,
      company: input.company ?? undefined,
      place: input.place ?? undefined,
      remote: input.remote ?? undefined,
      salary: input.salary ?? undefined,
      salaryMin: input.salaryMin ?? undefined,
      salaryMax: input.salaryMax ?? undefined,
      currency: input.currency ?? undefined,
      postedAt: input.postedAt ? new Date(input.postedAt) : undefined,
      url: input.url ?? undefined,
      via: input.via ?? undefined,
      description: input.description ?? undefined,
      complete: input.complete ?? undefined,
    },
  });
}

export async function savePosting(id: string) {
  return prisma.posting.update({ where: { id }, data: { savedAt: new Date() } });
}

export async function dismissPosting(id: string) {
  return prisma.posting.update({ where: { id }, data: { dismissedAt: new Date() } });
}

export async function listPostings(options: { saved?: boolean; dismissed?: boolean } = {}) {
  return prisma.posting.findMany({
    where: {
      ...(options.saved ? { savedAt: { not: null } } : {}),
      ...(options.dismissed ? { dismissedAt: { not: null } } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getPosting(id: string) {
  return prisma.posting.findUnique({ where: { id } });
}

export async function scorePosting(source: string, externalId: string, score: number, reasons: string[], redFlags: string[], scoredWith: string) {
  return prisma.postingScore.upsert({
    where: { source_externalId: { source, externalId } },
    create: { source, externalId, score, reasons: JSON.stringify(reasons), redFlags: JSON.stringify(redFlags), scoredWith },
    update: { score, reasons: JSON.stringify(reasons), redFlags: JSON.stringify(redFlags), scoredWith },
  });
}

export async function getPostingScore(source: string, externalId: string) {
  const row = await prisma.postingScore.findUnique({ where: { source_externalId: { source, externalId } } });
  if (!row) return null;
  return { ...row, reasons: JSON.parse(row.reasons) as string[], redFlags: JSON.parse(row.redFlags) as string[] };
}
