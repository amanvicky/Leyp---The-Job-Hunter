"use client";

import { useState, useTransition } from "react";
import { saveAiSettingsAction, loadAiSettingsAction } from "@/lib/actions/settings";

const KINDS = ["ollama", "openai", "anthropic", "mistral"] as const;

export function AiSettingsForm() {
  const [kind, setKind] = useState<(typeof KINDS)[number]>("ollama");
  const [model, setModel] = useState("qwen2.5:3b");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("http://localhost:11434/v1");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="card" style={{ marginTop: "16px" }}>
      <h2>AI provider</h2>
      <p className="muted">Stored on this machine only. Nothing is sent anywhere else.</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "8px" }}>
        <label>
          <span className="muted" style={{ display: "block", marginBottom: "4px" }}>Provider</span>
          <select value={kind} onChange={(e) => setKind(e.target.value as (typeof KINDS)[number])} style={{ width: "100%", padding: "8px", border: "1px solid var(--line)", borderRadius: "8px" }}>
            {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </label>
        <label>
          <span className="muted" style={{ display: "block", marginBottom: "4px" }}>Model</span>
          <input value={model} onChange={(e) => setModel(e.target.value)} style={{ width: "100%", padding: "8px", border: "1px solid var(--line)", borderRadius: "8px" }} />
        </label>
        <label>
          <span className="muted" style={{ display: "block", marginBottom: "4px" }}>Base URL</span>
          <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} style={{ width: "100%", padding: "8px", border: "1px solid var(--line)", borderRadius: "8px" }} />
        </label>
        <label>
          <span className="muted" style={{ display: "block", marginBottom: "4px" }}>API key (optional)</span>
          <input value={apiKey} onChange={(e) => setApiKey(e.target.value)} type="password" style={{ width: "100%", padding: "8px", border: "1px solid var(--line)", borderRadius: "8px" }} />
        </label>
      </div>
      <button
        type="button"
        className="button"
        disabled={pending || !model.trim()}
        style={{ marginTop: "12px" }}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            setMessage(null);
            const result = await saveAiSettingsAction({
              kind,
              model,
              apiKey: apiKey.trim() || undefined,
              baseUrl: baseUrl.trim() || undefined,
              timeoutSeconds: 120,
            });
            if (!result.ok) { setError(result.error); return; }
            setMessage("AI settings saved.");
          })
        }
      >
        Save AI settings
      </button>
      {error ? <p className="error" style={{ marginTop: "8px" }}>{error}</p> : null}
      {message ? <p className="muted" style={{ marginTop: "8px" }}>{message}</p> : null}
    </div>
  );
}
void loadAiSettingsAction;
