import { prisma } from "@/lib/prisma";

export async function upsertStartup(input: {
  source: string;
  externalId: string;
  company: string;
  website?: string;
  summary?: string;
  details?: string;
  location?: string;
  remote?: boolean | null;
  stage?: string;
  roles?: string[];
  emails?: string[];
  links?: string[];
  postedAt?: string | null;
  score?: number;
  reasons?: string[];
  scoredWith?: string;
  status?: string;
}) {
  return prisma.startup.upsert({
    where: { source_externalId: { source: input.source, externalId: input.externalId } },
    create: {
      source: input.source,
      externalId: input.externalId,
      company: input.company,
      website: input.website ?? "",
      summary: input.summary ?? "",
      details: input.details ?? "",
      location: input.location ?? "",
      remote: input.remote ?? null,
      stage: input.stage ?? "",
      roles: JSON.stringify(input.roles ?? []),
      emails: JSON.stringify(input.emails ?? []),
      links: JSON.stringify(input.links ?? []),
      postedAt: input.postedAt ? new Date(input.postedAt) : null,
      score: input.score ?? 0,
      reasons: JSON.stringify(input.reasons ?? []),
      scoredWith: input.scoredWith ?? "",
      status: input.status ?? "NEW",
    },
    update: {
      company: input.company,
      website: input.website ?? undefined,
      summary: input.summary ?? undefined,
      details: input.details ?? undefined,
      location: input.location ?? undefined,
      remote: input.remote ?? undefined,
      stage: input.stage ?? undefined,
      roles: input.roles ? JSON.stringify(input.roles) : undefined,
      emails: input.emails ? JSON.stringify(input.emails) : undefined,
      links: input.links ? JSON.stringify(input.links) : undefined,
      postedAt: input.postedAt ? new Date(input.postedAt) : undefined,
      score: input.score ?? undefined,
      reasons: input.reasons ? JSON.stringify(input.reasons) : undefined,
      scoredWith: input.scoredWith ?? undefined,
      status: input.status ?? undefined,
    },
  });
}

export async function listStartups(options: { status?: string; minScore?: number } = {}) {
  return prisma.startup.findMany({
    where: {
      ...(options.status ? { status: options.status } : {}),
      ...(options.minScore !== undefined ? { score: { gte: options.minScore } } : {}),
    },
    orderBy: [{ score: "desc" }, { seenAt: "desc" }],
  });
}

export async function getStartup(id: string) {
  return prisma.startup.findUnique({ where: { id } });
}

export async function updateStartupStatus(id: string, status: string) {
  return prisma.startup.update({ where: { id }, data: { status } });
}

export async function blockStartup(hash: string) {
  return prisma.startupBlock.upsert({
    where: { hash },
    create: { hash },
    update: {},
  });
}

export async function isStartupBlocked(hash: string): Promise<boolean> {
  const row = await prisma.startupBlock.findUnique({ where: { hash } });
  return Boolean(row);
}
