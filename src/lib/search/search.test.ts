import { describe, expect, it, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { upsertPosting, savePosting, dismissPosting, listPostings, scorePosting, getPostingScore } from "./postings";
import { createAgentCandidate, listAgentCandidates, approveAgentCandidate, dismissAgentCandidate } from "./agents";
import { upsertStartup, listStartups, blockStartup, isStartupBlocked } from "./startups";

beforeEach(async () => {
  await prisma.postingScore.deleteMany({});
  await prisma.posting.deleteMany({});
  await prisma.agentCandidate.deleteMany({});
  await prisma.startup.deleteMany({});
  await prisma.startupBlock.deleteMany({});
});

describe("search data layer", () => {
  it("upserts and retrieves a posting", async () => {
    const posting = await upsertPosting({ source: "ADZUNA", externalId: "1", title: "Backend Engineer", company: "Acme" });
    const again = await upsertPosting({ source: "ADZUNA", externalId: "1", title: "Backend Engineer v2", company: "Acme" });
    expect(again.id).toBe(posting.id);
    expect(again.title).toBe("Backend Engineer v2");
  });

  it("saves and dismisses postings", async () => {
    const posting = await upsertPosting({ source: "ADZUNA", externalId: "2", title: "T", company: "C" });
    await savePosting(posting.id);
    await dismissPosting(posting.id);
    const saved = await listPostings({ saved: true });
    const dismissed = await listPostings({ dismissed: true });
    expect(saved).toHaveLength(1);
    expect(dismissed).toHaveLength(1);
  });

  it("stores and retrieves a score", async () => {
    await upsertPosting({ source: "ADZUNA", externalId: "3", title: "T", company: "C" });
    await scorePosting("ADZUNA", "3", 85, ["strong skill match"], ["low salary"], "match@1");
    const score = await getPostingScore("ADZUNA", "3");
    expect(score?.score).toBe(85);
    expect(score?.reasons).toEqual(["strong skill match"]);
    expect(score?.redFlags).toEqual(["low salary"]);
  });

  it("creates and lists agent candidates", async () => {
    const candidate = await createAgentCandidate({ source: "ADZUNA", externalId: "4", title: "T", company: "C", score: 75, reasons: ["good"] });
    const list = await listAgentCandidates({ minScore: 70 });
    expect(list).toHaveLength(1);
    expect(list[0]?.id).toBe(candidate.id);
  });

  it("approves and dismisses candidates", async () => {
    const candidate = await createAgentCandidate({ source: "ADZUNA", externalId: "5", title: "T", company: "C" });
    const app = await (await import("@/lib/prisma")).prisma.application.create({ data: { title: "T", company: "C" } });
    await approveAgentCandidate(candidate.id, app.id);
    const approved = await (await import("@/lib/prisma")).prisma.agentCandidate.findUnique({ where: { id: candidate.id } });
    expect(approved?.status).toBe("APPROVED");
    expect(approved?.applicationId).toBe(app.id);
  });

  it("upserts and lists startups", async () => {
    await upsertStartup({ source: "WELLFOUND", externalId: "s1", company: "Acme", score: 80, reasons: ["strong"] });
    const list = await listStartups({ minScore: 70 });
    expect(list).toHaveLength(1);
    expect(list[0]?.company).toBe("Acme");
  });

  it("blocks a startup by hash", async () => {
    expect(await isStartupBlocked("abc123")).toBe(false);
    await blockStartup("abc123");
    expect(await isStartupBlocked("abc123")).toBe(true);
  });
});
