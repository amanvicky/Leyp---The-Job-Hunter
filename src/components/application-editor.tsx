"use client";

import { useState, useTransition } from "react";
import { createApplicationFromPasteAction } from "@/lib/actions/applications";
import { matchResultSchema } from "@/lib/ai/writing-schemas";

export type ApplicationEditorData = {
  id: string;
  title: string;
  company: string;
  status: string;
  postingText: string;
  extracted: string | null;
  match: string | null;
  tone: string;
};

const TONES = ["WARM", "FORMAL", "DIRECT", "ENTHUSIASTIC"] as const;

export function ApplicationEditor({ onCreated }: { onCreated?: (id: string) => void } = {}) {
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [tone, setTone] = useState<(typeof TONES)[number]>("WARM");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [created, setCreated] = useState<{ id: string; title: string; company: string; confidence: string; requirements: string[] } | null>(null);

  return (
    <div className="application-editor">
      <section className="card" aria-labelledby="paste-form">
        <h2 id="paste-form">Paste a posting</h2>
        <p className="muted">Nothing leaves this machine. We read it offline first.</p>
        <label style={{ display: "block", marginBottom: "8px" }}>
          <span className="muted" style={{ display: "block", marginBottom: "4px" }}>Posting URL (optional)</span>
          <input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://…"
            aria-label="Posting URL"
            style={{ width: "100%", padding: "8px", border: "1px solid var(--line)", borderRadius: "8px" }}
          />
        </label>
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={12}
          placeholder="Paste the full job posting here…"
          aria-label="Posting text"
          style={{ width: "100%", padding: "8px", border: "1px solid var(--line)", borderRadius: "8px" }}
        />
        <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "8px", flexWrap: "wrap" }}>
          <label className="muted">
            Tone
            <select
              value={tone}
              onChange={(event) => setTone(event.target.value as (typeof TONES)[number])}
              aria-label="Tone"
              style={{ marginLeft: "8px", padding: "6px", border: "1px solid var(--line)", borderRadius: "8px" }}
            >
              {TONES.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="button"
            disabled={pending || text.trim().length === 0}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                setMessage(null);
                const result = await createApplicationFromPasteAction({ text, postingUrl: url, tone });
                if (!result.ok) {
                  setError(result.error);
                  return;
                }
                setCreated({
                  id: result.data.applicationId,
                  title: result.data.extracted.title || "Untitled role",
                  company: result.data.extracted.company || "Unknown company",
                  confidence: result.data.extracted.confidence,
                  requirements: result.data.extracted.requirements,
                });
                setText("");
                setMessage(`Created application ${result.data.applicationId}.`);
                onCreated?.(result.data.applicationId);
              })
            }
          >
            Create application
          </button>
        </div>
      </section>

      {created ? (
        <section className="card" aria-labelledby="created-heading" style={{ marginTop: "16px" }}>
          <h2 id="created-heading">Created: {created.title} · {created.company}</h2>
          <p className="muted">Confidence: {created.confidence}. {created.requirements.length} requirements extracted.</p>
          <ul>
            {created.requirements.map((requirement, index) => (
              <li key={index}>{requirement}</li>
            ))}
          </ul>
          <p>
            <a href={`/applications/${created.id}`} className="button">
              Open application
            </a>
          </p>
        </section>
      ) : null}

      {error ? <p className="error" style={{ marginTop: "12px" }}>{error}</p> : null}
      {message ? <p className="muted" style={{ marginTop: "12px" }}>{message}</p> : null}
    </div>
  );
}

// Kept so the type is referenced; avoids an unused-import lint in some setups.
// Type is declared above; nothing else to export.
void matchResultSchema;
