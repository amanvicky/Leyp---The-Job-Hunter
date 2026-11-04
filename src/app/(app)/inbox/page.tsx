import { verifySession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { InboxList } from "@/components/inbox-list";

export const metadata = { title: "Inbox · Leyp" };

export default async function InboxPage() {
  await verifySession();

  const rows = await prisma.emailMessage.findMany({
    where: { direction: "INCOMING" },
    orderBy: { sentAt: "desc" },
    take: 50,
    include: { application: { select: { id: true, title: true, company: true } } },
  });

  const initial = rows.map((row) => ({
    id: row.id,
    subject: row.subject,
    fromName: row.fromName,
    fromAddress: row.fromAddress,
    kind: row.kind,
    summary: row.summary,
    replyDraft: row.replyDraft,
    sentAt: row.sentAt,
    application: row.application,
  }));

  return (
    <div className="page">
      <h1>Inbox</h1>
      <p className="muted">
        Employer replies, classified and linked to the application they belong to. A drafted answer is only a
        draft: nothing is sent from here.
      </p>

      <InboxList initial={initial} />
    </div>
  );
}
