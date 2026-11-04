"use client";

import { useState, useTransition } from "react";
import { sendApplicationEmailAction } from "@/lib/actions/send-email";

export function SendEmailCard({ applicationId, to }: { applicationId: string; to: string }) {
  const [pending, startTransition] = useTransition();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function send() {
    if (!confirmed) return;
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await sendApplicationEmailAction({
        applicationId,
        to,
        subject,
        body,
        confirmed: true,
      });
      if (result.ok) {
        setMessage(`Sent. Message id ${result.data.messageId}.`);
        setConfirmed(false);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <section className="card" style={{ marginTop: "16px" }}>
      <h2>Send email</h2>
      <p className="muted">
        Sending is never automatic. Fill in the recipient, subject and body, then confirm.
      </p>
      <label>
        <span className="muted">To</span>
        <input
          value={to}
          readOnly
          style={{ width: "100%", padding: "6px", border: "1px solid var(--line)", borderRadius: "8px" }}
        />
      </label>
      <label style={{ display: "block", marginTop: "8px" }}>
        <span className="muted">Subject</span>
        <input
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          style={{ width: "100%", padding: "6px", border: "1px solid var(--line)", borderRadius: "8px" }}
        />
      </label>
      <label style={{ display: "block", marginTop: "8px" }}>
        <span className="muted">Body</span>
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={8}
          style={{ width: "100%", padding: "6px", border: "1px solid var(--line)", borderRadius: "8px" }}
        />
      </label>
      <label style={{ display: "block", marginTop: "8px" }}>
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
        />{" "}
        <span className="muted">I have reviewed the email and want to send it.</span>
      </label>
      <button
        type="button"
        className="button"
        onClick={send}
        disabled={pending || !confirmed || !subject.trim() || !body.trim()}
        style={{ marginTop: "8px" }}
      >
        {pending ? "Sending…" : "Send"}
      </button>
      {error ? (
        <p className="muted" role="alert" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      ) : null}
      {message ? <p className="muted" role="status">{message}</p> : null}
    </section>
  );
}