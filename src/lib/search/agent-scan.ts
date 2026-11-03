import { prisma } from "@/lib/prisma";
import { scorePosting } from "@/lib/ai/tasks/score-posting";
import { createAgentCandidate } from "./agents";
import { upsertPosting } from "./postings";
import { loadProviderFromSettings } from "@/lib/ai/config-store";
import { buildProfileSummary } from "@/lib/profile/summary";

export type AgentScanInput = {
  source: string;
  postings: Array<{
    externalId: string;
    title: string;
    company: string;
    place?: string;
    remote?: boolean | null;
    salary?: string;
    postedAt?: string | null;
    url?: string;
    description?: string;
  }>;
};

export async function agentScan(input: AgentScanInput): Promise<{ scored: number; candidates: number }> {
  const provider = await loadProviderFromSettings();
  if (!provider) throw new Error("Configure an AI provider in Settings first.");

  const profileSummary = (await buildProfileSummary()).slice(0, 600);
  let scored = 0;
  let candidates = 0;

  for (const p of input.postings) {
    await upsertPosting({
      source: input.source,
      externalId: p.externalId,
      title: p.title,
      company: p.company,
      place: p.place,
      remote: p.remote,
      salary: p.salary,
      postedAt: p.postedAt,
      url: p.url,
      description: p.description,
      complete: Boolean(p.description),
    });

    const result = await scorePosting(provider, { postingText: p.description ?? p.title, profileSummary });

    const existing = await prisma.postingScore.findUnique({
      where: { source_externalId: { source: input.source, externalId: p.externalId } },
    });
    if (!existing) {
      await prisma.postingScore.create({
        data: {
          source: input.source,
          externalId: p.externalId,
          score: result.score,
          reasons: JSON.stringify(result.reasons),
          redFlags: JSON.stringify(result.redFlags),
          scoredWith: "score-posting@1",
        },
      });
    } else {
      await prisma.postingScore.update({
        where: { source_externalId: { source: input.source, externalId: p.externalId } },
        data: { score: result.score, reasons: JSON.stringify(result.reasons), redFlags: JSON.stringify(result.redFlags), scoredWith: "score-posting@1" },
      });
    }

    scored++;

    // Create agent candidate if score >= 60.
    if (result.score >= 60) {
      await createAgentCandidate({
        source: input.source,
        externalId: p.externalId,
        title: p.title,
        company: p.company,
        place: p.place,
        remote: p.remote,
        salary: p.salary,
        postedAt: p.postedAt,
        url: p.url,
        description: p.description,
        complete: Boolean(p.description),
        score: result.score,
        reasons: result.reasons,
        redFlags: result.redFlags,
        status: "SCORED",
      });
      candidates++;
    }
  }

  return { scored, candidates };
}
