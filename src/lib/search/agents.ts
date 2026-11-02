import { prisma } from "@/lib/prisma";
import { dedupeKeyFor } from "./schemas";

export async function createAgentCandidate(input: {
  source: string;
  externalId: string;
  title?: string;
  company?: string;
  place?: string;
  remote?: boolean | null;
  salary?: string;
  postedAt?: string | null;
  url?: string;
  via?: string;
  description?: string;
  complete?: boolean;
  score?: number;
  reasons?: string[] | null;
  redFlags?: string[] | null;
  status?: string;
}) {
  return prisma.agentCandidate.create({
    data: {
      source: input.source,
      externalId: input.externalId,
      dedupeKey: dedupeKeyFor(input.source, input.externalId),
      title: input.title ?? "",
      company: input.company ?? "",
      place: input.place ?? "",
      remote: input.remote ?? null,
      salary: input.salary ?? "",
      postedAt: input.postedAt ? new Date(input.postedAt) : null,
      url: input.url ?? "",
      via: input.via ?? "",
      description: input.description ?? "",
      complete: input.complete ?? false,
      score: input.score ?? 0,
      reasons: input.reasons ? JSON.stringify(input.reasons) : null,
      redFlags: input.redFlags ? JSON.stringify(input.redFlags) : null,
      status: input.status ?? "SCORED",
    },
  });
}

export async function updateAgentCandidate(id: string, patch: Partial<{
  score: number;
  reasons: string[] | null;
  redFlags: string[] | null;
  status: string;
  error: string | null;
  applicationId: string | null;
}>) {
  const data: Record<string, unknown> = {};
  if (patch.score !== undefined) data.score = patch.score;
  if (patch.status !== undefined) data.status = patch.status;
  if (patch.error !== undefined) data.error = patch.error;
  if (patch.applicationId !== undefined) data.applicationId = patch.applicationId;
  if (patch.reasons !== undefined) data.reasons = patch.reasons ? JSON.stringify(patch.reasons) : null;
  if (patch.redFlags !== undefined) data.redFlags = patch.redFlags ? JSON.stringify(patch.redFlags) : null;
  return prisma.agentCandidate.update({ where: { id }, data });
}

export async function listAgentCandidates(options: { status?: string; minScore?: number } = {}) {
  return prisma.agentCandidate.findMany({
    where: {
      ...(options.status ? { status: options.status } : {}),
      ...(options.minScore !== undefined ? { score: { gte: options.minScore } } : {}),
    },
    orderBy: [{ score: "desc" }, { createdAt: "desc" }],
  });
}

export async function getAgentCandidate(id: string) {
  return prisma.agentCandidate.findUnique({ where: { id } });
}

export async function approveAgentCandidate(id: string, applicationId: string) {
  return prisma.agentCandidate.update({
    where: { id },
    data: { status: "APPROVED", applicationId },
  });
}

export async function dismissAgentCandidate(id: string) {
  return prisma.agentCandidate.update({ where: { id }, data: { status: "DISMISSED" } });
}
