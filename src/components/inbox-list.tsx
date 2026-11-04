"use client";

import { useState, useTransition } from "react";
import { syncInboxAction, listRepliesAction, draftReplyAction } from "@/lib/actions/inbox";

type Reply = {
  id: string;
  subject: string;
  fromName: string;
  fromAddress: string;
  kind: string | null;
  summary: string;
  replyDraft: string;
  sentAt: string | Date;
  application: { id: string; title: string; company: string } | null;
};

const KIND_LABEL: Record<string, string> = {
  REJECTION: "Rejection",
  INTERVIEW: "Interview",
  QUESTION: "Question",
  OFFER: "Offer",
  ACKNOWLEDGEMENT: "Acknowledgement",
  OTHER: "Other",
};

export function InboxList({ initial }: { initial: Reply[] }) {
  const [pending, startTransition] = useTransition();
  const [rows, setRows] = useState<Reply[]>(initial);
  const [message, setMessage] = useState<string | null>(null);
  const [drafting, setDrafting] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { answer: string; gaps: string[] }>>({});

  function sync() {
    setMessage(null);
    startTransition(async () => {
      const result = await syncInboxAction({});
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setMessage(
        `Sync done: ${result.data.synced} message${result.data.synced === 1 ? "" : "s"}, ${result.data.classified} classified, ${result.data.linked} linked to an application.`,
      );
      const listed = await listRepliesAction({ limit: 50 });
      if (listed.ok) setRows(listed.data);
    });
  }

  function draft(id: string) {
    setDrafting(id);
    setMessage(null);
    startTransition(async () => {
      const result = await draftReplyAction({ emailId: id });
      setDrafting(null);
      if (result.ok) {
        setDrafts((current) => ({ ...current, [id]: result.data }));
      } else {
        setMessage(result.error);
      }
    });
  }

  return (
    <div>
      <button type="button" className="button" onClick={sync} disabled={pending}>
        {pending ? "Workingâ€¦" : "Sync inbox"}
      </button>

      {message ? (
        <p className="muted" role="status">
          {message}
        </p>
      ) : null}

      {rows.length === 0 ? (
        <p className="muted">
          No replies yet. Connect Google in Settings, then sync to pull the newest messages.
        </p>
      ) : (
        <ul className="list-plain">
          {rows.map((row) => {
            const made = drafts[row.id];
            const body = made?.answer ?? row.replyDraft;
            return (
              <li key={row.id} className="card">
                <h3>{row.subject || "(no subject)"}</h3>
                <p className="muted">
                  {[row.fromName || row.fromAddress, new Date(row.sentAt).toLocaleString()]
                    .filter(Boolean)
                    .join(" Â· ")}
                </p>
                {row.kind ? (
                  <p>
                    <strong>{KIND_LABEL[row.kind] ?? row.kind}</strong>
                  </p>
                ) : (
                  <p className="muted">Not classified yet.</p>
                )}
                {row.application ? (
                  <p>
                    Linked to{" "}
                    <a href={`/applications/${row.application.id}`}>
                      {row.application.title || row.application.company || "an application"}
                    </a>
                  </p>
                ) : (
                  <p className="muted">Not linked to an application.</p>
                )}
                {body ? (
                  <div>
                    <p className="muted">Drafted answer</p>
                    <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0 }}>{body}</pre>
                    {made && made.gaps.length > 0 ? (
                      <>
                        <p className="muted">Could not answer from your profile</p>
                        <ul>
                          {made.gaps.map((gap: string, index: number) => (
                            <li key={index}>{gap}</li>
                          ))}
                        </ul>
                      </>
                    ) : null}
                  </div>
                ) : (
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() => draft(row.id)}
                    disabled={pending || drafting === row.id}
                  >
                    {drafting === row.id ? "Draftingâ€¦" : "Draft a reply"}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
