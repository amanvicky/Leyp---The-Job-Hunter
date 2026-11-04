"use server";

import { z } from "zod";
import { serverAction } from "@/lib/action";
import { prisma } from "@/lib/prisma";
import {
  listAgentCandidates,
  approveAgentCandidate,
  dismissAgentCandidate,
} from "@/lib/search/agents";
import { createApplication } from "@/lib/applications/core";

export const listAgentCandidatesAction = serverAction(
  z.object({ status: z.string().optional(), minScore: z.number().int().min(0).max(100).optional() }),
  async (input) => {
    const rows = await listAgentCandidates(input);
    return rows.map((row) => ({
      id: row.id,
      source: row.source,
      externalId: row.externalId,
      title: row.title,
      company: row.company,
      place: row.place,
      salary: row.salary,
      url: row.url,
      score: row.score,
      reasons: row.reasons ? (JSON.parse(row.reasons) as string[]) : [],
      redFlags: row.redFlags ? (JSON.parse(row.redFlags) as string[]) : [],
      status: row.status,
      error: row.error,
      createdAt: row.createdAt,
    }));
  },
);

/**
 * Approving a candidate is the moment a machine suggestion becomes a real
 * application. The application inherits the candidate's posting text so the
 * usual match / tailor / cover-letter flow works on it unchanged.
 */
export const approveAgentCandidateAction = serverAction(
  z.object({ candidateId: z.string().min(1) }),
  async (input) => {
    const candidate = await prisma.agentCandidate.findUnique({ where: { id: input.candidateId } });
    if (!candidate) throw new Error("That candidate is no longer here.");
    if (candidate.status === "APPROVED") throw new Error("That candidate was already approved.");

    const application = await createApplication({
      title: candidate.title,
      company: candidate.company,
      location: candidate.place,
      salary: candidate.salary,
      postingUrl: candidate.url,
      postingText: candidate.description,
      origin: "AGENT",
      agentScore: candidate.score,
    });

    await approveAgentCandidate(candidate.id, application.id);
    return { applicationId: application.id };
  },
);

export const dismissAgentCandidateAction = serverAction(
  z.object({ candidateId: z.string().min(1) }),
  async (input) => {
    await dismissAgentCandidate(input.candidateId);
    return { dismissed: true };
  },
);
