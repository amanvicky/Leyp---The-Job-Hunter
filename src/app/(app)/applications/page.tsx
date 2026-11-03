import { verifySession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { ApplicationEditor } from "@/components/application-editor";

export const metadata = { title: "Applications · Leyp" };

export default async function ApplicationsPage() {
  await verifySession();
  const applications = await prisma.application.findMany({
    where: { awaitingReview: false, archivedAt: null },
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: { id: true, title: true, company: true, status: true, updatedAt: true },
  });

  return (
    <div className="page">
      <h1>Applications</h1>

      <ApplicationEditor />

      <h2 style={{ marginTop: "24px" }}>Your applications</h2>
      {applications.length === 0 ? (
        <p className="muted">Nothing here yet. Paste a posting above to start one.</p>
      ) : (
        <table>
          <caption className="muted">Most recently updated first.</caption>
          <thead>
            <tr>
              <th scope="col">Role</th>
              <th scope="col">Company</th>
              <th scope="col">Status</th>
              <th scope="col">Updated</th>
            </tr>
          </thead>
          <tbody>
            {applications.map((application) => (
              <tr key={application.id}>
                <td>
                  <a href={`/applications/${application.id}`}>{application.title || "Untitled"}</a>
                </td>
                <td>{application.company || "—"}</td>
                <td>{application.status}</td>
                <td>{application.updatedAt.toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
