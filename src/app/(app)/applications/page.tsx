import { prisma } from "@/lib/prisma";

export const metadata = { title: "Applications · Leyp" };

export default async function ApplicationsPage() {
  const applications = await prisma.application.findMany({
    // Agent drafts stay hidden until a human approves them.
    where: { awaitingReview: false },
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: { id: true, title: true, company: true, status: true, updatedAt: true },
  });

  return (
    <div className="page">
      <h1>Applications</h1>
      {applications.length === 0 ? (
        <p className="muted">
          Nothing here yet. Starting an application from a posting arrives in phase 3.
        </p>
      ) : (
        <table>
          <caption className="muted">Your applications, most recently updated first.</caption>
          <thead>
            <tr>
              <th scope="col">Role</th>
              <th scope="col">Company</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {applications.map((application) => (
              <tr key={application.id}>
                <td>{application.title || "Untitled"}</td>
                <td>{application.company || "—"}</td>
                <td>{application.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
