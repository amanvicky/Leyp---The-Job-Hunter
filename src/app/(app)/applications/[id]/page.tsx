import { verifySession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getApplicationAction } from "@/lib/actions/applications";
import { transitionApplicationAction, archiveApplicationAction, unarchiveApplicationAction, addNoteAction } from "@/lib/actions/applications";
import { ApplicationActions } from "@/components/application-actions";
import { WriteEmailCard } from "@/components/write-email-card";
import { SendEmailCard } from "@/components/send-email-card";
import { RefineChat } from "@/components/refine-chat";

export const metadata = { title: "Application - Leyp" };

export default async function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await verifySession();
  const { id } = await params;
  const result = await getApplicationAction({ id });

  if (!result.ok) {
    return (
      <div className="page">
        <h1>Application not found</h1>
        <p className="muted">{result.error}</p>
        <p><a href="/applications">Back to applications</a></p>
      </div>
    );
  }

  const app = result.data;

  return (
    <div className="page">
      <p><a href="/applications">? Applications</a></p>
      <h1>{app.title || "Untitled role"}</h1>
      <p className="muted">{app.company || "Unknown company"} - {app.status}</p>

      <ApplicationActions applicationId={id} />\n      <WriteEmailCard applicationId={id} />\n      <SendEmailCard applicationId={id} to="" />\n      <WriteEmailCard applicationId={id} />\n\n      {app.documents.some((d: { kind: string }) => d.kind === "RESUME") ? <RefineChat applicationId={id} documentKind="RESUME" /> : null}\n      {app.documents.some((d: { kind: string }) => d.kind === "COVER_LETTER") ? <RefineChat applicationId={id} documentKind="COVER_LETTER" /> : null}

      <section className="card" style={{ marginTop: "16px" }}>
        <h2>Details</h2>
        <dl>
          <dt>Role</dt><dd>{app.role || "-"}</dd>
          <dt>Location</dt><dd>{app.location || "-"}</dd>
          <dt>Salary</dt><dd>{app.salary || "-"} {app.currency}</dd>
          <dt>Tone</dt><dd>{app.tone}</dd>
          <dt>Posting URL</dt><dd>{app.postingUrl ? <a href={app.postingUrl} target="_blank" rel="noreferrer">{app.postingUrl}</a> : "-"}</dd>
          <dt>Created</dt><dd>{new Date(app.createdAt).toLocaleString()}</dd>
          <dt>Updated</dt><dd>{new Date(app.updatedAt).toLocaleString()}</dd>
        </dl>
      </section>

      {app.postingText ? (
        <section className="card" style={{ marginTop: "16px" }}>
          <h2>Posting</h2>
          <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0 }}>{app.postingText}</pre>
        </section>
      ) : null}

      {app.extracted ? (
        <section className="card" style={{ marginTop: "16px" }}>
          <h2>Extracted</h2>
          <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0 }}>{app.extracted}</pre>
        </section>
      ) : null}

      {app.match ? (
        <section className="card" style={{ marginTop: "16px" }}>
          <h2>Match</h2>
          <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0 }}>{app.match}</pre>
        </section>
      ) : null}

      <section className="card" style={{ marginTop: "16px" }}>
        <h2>Status</h2>
        <p className="muted">Current: {app.status}</p>
        <form action={async (formData: FormData) => {
          "use server";
          const to = String(formData.get("to") ?? "");
          await transitionApplicationAction({ applicationId: id, to: to as "DRAFT" | "SENT" | "SCREENING" | "INTERVIEW" | "OFFER" | "ACCEPTED" | "REJECTED" | "DECLINED" });
        }}>
          <select name="to" defaultValue={app.status} style={{ padding: "6px", border: "1px solid var(--line)", borderRadius: "8px" }}>
            {["DRAFT","SENT","SCREENING","INTERVIEW","OFFER","ACCEPTED","REJECTED","DECLINED"].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button type="submit" className="button" style={{ marginLeft: "8px" }}>Transition</button>
        </form>
      </section>

      <section className="card" style={{ marginTop: "16px" }}>
        <h2>Notes ({app.notes.length})</h2>
        <ul>
          {app.notes.map((note) => (
            <li key={note.id}>{note.body} <span className="muted">- {new Date(note.createdAt).toLocaleString()}</span></li>
          ))}
        </ul>
        <form action={async (formData: FormData) => {
          "use server";
          const body = String(formData.get("body") ?? "").trim();
          if (body) await addNoteAction({ applicationId: id, body });
        }}>
          <textarea name="body" rows={3} placeholder="Add a note" style={{ width: "100%", padding: "8px", border: "1px solid var(--line)", borderRadius: "8px" }} />
          <button type="submit" className="button" style={{ marginTop: "8px" }}>Add note</button>
        </form>
      </section>

      <section className="card" style={{ marginTop: "16px" }}>
        <h2>Documents</h2>
        {app.documents.length === 0 ? (
          <p className="muted">No documents yet. Use the AI actions above.</p>
        ) : (
          <ul>
            {app.documents.map((doc) => (
              <li key={doc.id}>{doc.kind} - {doc.units.length} units - updated {new Date(doc.updatedAt).toLocaleString()}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="card" style={{ marginTop: "16px" }}>
        <h2>Danger zone</h2>
        <form action={async () => {
          "use server";
          await archiveApplicationAction({ applicationId: id });
        }}>
          <button type="submit" className="button secondary">Archive application</button>
        </form>
      </section>
    </div>
  );
}

