"use client";

import { useState, useTransition } from "react";
import { approveAgentCandidateAction, dismissAgentCandidateAction } from "@/lib/actions/agent";

export type AgentRow = {
  id: string;
  title: string;
  company: string;
  place: string;
  salary: string;
  url: string;
  score: number;
  reasons: string[];
  redFlags: string[];
  status: string;
  createdAt: string | Date;
};

export function AgentList({ rows }: { rows: AgentRow[] }) {
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [hidden, setHidden] = useState<string[]>([]);

  function approve(id: string) {
    setBusyId(id);
    setMessage(null);
    startTransition(async () => {
      const result = await approveAgentCandidateAction({ candidateId: id });
      setBusyId(null);
      if (result.ok) {
        setHidden((current) => [...current, id]);
        setMessage(`Approved. It is now an application you can work on.`);
      } else {
        setMessage(result.error);
      }
    });
  }

  function dismiss(id: string) {
    setBusyId(id);
    setMessage(null);
    startTransition(async () => {
      const result = await dismissAgentCandidateAction({ candidateId: id });
      setBusyId(null);
      if (result.ok) {
        setHidden((current) => [...current, id]);
        setMessage("Dismissed.");
      } else {
        setMessage(result.error);
      }
    });
  }

  const visible = rows.filter((row) => !hidden.includes(row.id));

  if (visible.length === 0) {
    return <p className="muted">Nothing waiting. The agent adds postings here when its scan scores them well.</p>;
  }

  return (
    <div>
      {message ? (
        <p className="muted" role="status">
          {message}
        </p>
      ) : null}
      <ul className="list-plain">
        {visible.map((row) => (
          <li key={row.id} className="card">
            <h3>
              {row.url ? (
                <a href={row.url} target="_blank" rel="noreferrer">
                  {row.title || "Untitled role"}
                </a>
              ) : (
                row.title || "Untitled role"
              )}
            </h3>
            <p className="muted">
              {[row.company, row.place, row.salary].filter(Boolean).join(" · ") || "No details"}
            </p>
            <p>
              <strong>Score {row.score}/100</strong>
            </p>
            {row.reasons.length > 0 ? (
              <div>
                <p className="muted">Why it scored well</p>
                <ul>
                  {row.reasons.map((reason, index) => (
                    <li key={index}>{reason}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {row.redFlags.length > 0 ? (
              <div>
                <p className="muted">Red flags</p>
                <ul>
                  {row.redFlags.map((flag, index) => (
                    <li key={index}>{flag}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
              <button
                type="button"
                className="button"
                onClick={() => approve(row.id)}
                disabled={pending || busyId === row.id}
              >
                {busyId === row.id ? "Working…" : "Approve"}
              </button>
              <button
                type="button"
                className="button secondary"
                onClick={() => dismiss(row.id)}
                disabled={pending || busyId === row.id}
              >
                Dismiss
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
