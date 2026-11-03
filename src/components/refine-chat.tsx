"use client";

import { useTransition, useState } from "react";
import { refineChatAction } from "@/lib/actions/ai-docs";

export function RefineChat({ applicationId, documentKind }: { applicationId: string; documentKind: "RESUME" | "COVER_LETTER" }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await refineChatAction({ applicationId, kind: documentKind, message });
      if (res.ok) {
        setReply(res.data.reply);
        setMessage("");
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="card" style={{ marginTop: "16px" }}>
      <h2>Refine {documentKind === "RESUME" ? "resume" : "cover letter"}</h2>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={3}
        placeholder="e.g. make the summary shorter"
        style={{ width: "100%", padding: "8px", border: "1px solid var(--line)", borderRadius: "8px" }}
      />
      <button type="button" className="button" onClick={submit} disabled={pending || !message.trim()} style={{ marginTop: "8px" }}>
        {pending ? "Refining..." : "Send"}
      </button>
      {error ? <p className="muted" style={{ color: "var(--danger)" }}>{error}</p> : null}
      {reply ? <p className="muted" style={{ marginTop: "8px" }}>{reply}</p> : null}
    </div>
  );
}