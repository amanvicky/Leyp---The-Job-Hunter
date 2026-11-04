"use client";

import { useState, useTransition } from "react";
import { writeEmailAction } from "@/lib/actions/ai-docs";

export function WriteEmailCard({ applicationId }: { applicationId: string }) {
  const [pending, startTransition] = useTransition();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState(false);

  function generate() {
    setError(null);
    startTransition(async () => {
      const result = await writeEmailAction({ applicationId });
      if (result.ok) {
        setSubject(result.data.subject);
        setBody(result.data.body);
        setGenerated(true);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <section className="card" style={{ marginTop: "16px" }}>
      <h2>Application email</h2>
      <button type="button" className="button" onClick={generate} disabled={pending}>
        {pending ? "Generating…" : generated ? "Regenerate" : "Write email"}
      </button>
      {error ? (
        <p className="muted" role="alert" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      ) : null}
      {generated ? (
        <div style={{ marginTop: "12px" }}>
          <label>
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
          <p className="muted" style={{ marginTop: "8px" }}>
            Review the subject and body above, then confirm before sending. Nothing is sent until you confirm.
          </p>
        </div>
      ) : null}
    </section>
  );
}