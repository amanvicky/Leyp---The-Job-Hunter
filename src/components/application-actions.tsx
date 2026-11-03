"use client";

import { useState, useTransition } from "react";
import { runMatchAction, runTailorResumeAction, runCoverLetterAction } from "@/lib/actions/ai-docs";

export function ApplicationActions({ applicationId }: { applicationId: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [match, setMatch] = useState<{ score: number; report: string } | null>(null);
  const [units, setUnits] = useState<{ kind: string; count: number } | null>(null);

  return (
    <div className="card" style={{ marginTop: "16px" }}>
      <h2>AI actions</h2>
      <p className="muted">Uses the provider configured in Settings.</p>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "8px" }}>
        <button
          type="button"
          className="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setError(null); setMessage(null);
              const r = await runMatchAction({ applicationId });
              if (!r.ok) { setError(r.error); return; }
              setMatch({ score: r.data.score, report: r.data.report });
              setMessage(`Match score: ${r.data.score}/100.`);
            })
          }
        >
          Run match
        </button>
        <button
          type="button"
          className="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setError(null); setMessage(null);
              const r = await runTailorResumeAction({ applicationId, tone: "WARM" });
              if (!r.ok) { setError(r.error); return; }
              setUnits({ kind: "RESUME", count: r.data.units.length });
              setMessage(`Tailored resume: ${r.data.units.length} units.`);
            })
          }
        >
          Tailor resume
        </button>
        <button
          type="button"
          className="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setError(null); setMessage(null);
              const r = await runCoverLetterAction({ applicationId, tone: "WARM" });
              if (!r.ok) { setError(r.error); return; }
              setUnits({ kind: "COVER_LETTER", count: r.data.units.length });
              setMessage(`Cover letter: ${r.data.units.length} units.`);
            })
          }
        >
          Write cover letter
        </button>
      </div>
      {match ? <p className="muted" style={{ marginTop: "8px" }}>{match.report}</p> : null}
      {units ? <p className="muted" style={{ marginTop: "8px" }}>{units.kind}: {units.count} units stored.</p> : null}
      {error ? <p className="error" style={{ marginTop: "8px" }}>{error}</p> : null}
      {message ? <p className="muted" style={{ marginTop: "8px" }}>{message}</p> : null}
    </div>
  );
}

