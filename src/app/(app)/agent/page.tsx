import { verifySession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { AgentList, type AgentRow } from "@/components/agent-list";

export const metadata = { title: "Agent · Leyp" };

export default async function AgentPage() {
  await verifySession();

  const candidates = await prisma.agentCandidate.findMany({
    where: { status: { in: ["SCORED", "DRAFTING", "DRAFTED"] } },
    orderBy: [{ score: "desc" }, { createdAt: "desc" }],
    take: 50,
  });

  const rows: AgentRow[] = candidates.map((candidate) => ({
    id: candidate.id,
    title: candidate.title,
    company: candidate.company,
    place: candidate.place,
    salary: candidate.salary,
    url: candidate.url,
    score: candidate.score,
    reasons: candidate.reasons ? (JSON.parse(candidate.reasons) as string[]) : [],
    redFlags: candidate.redFlags ? (JSON.parse(candidate.redFlags) as string[]) : [],
    status: candidate.status,
    createdAt: candidate.createdAt,
  }));

  return (
    <div className="page">
      <h1>Agent</h1>
      <p className="muted">
        Postings the scan scored well, waiting for you. Nothing is sent and no application exists until you approve one.
      </p>

      <AgentList rows={rows} />
    </div>
  );
}
