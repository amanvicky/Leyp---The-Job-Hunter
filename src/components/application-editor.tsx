"use client";

import { useState } from "react";
import { createApplicationAction } from "@/lib/actions/applications";

export function ApplicationEditor({ onCreated }: { onCreated?: () => void }) {
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [location, setLocation] = useState("");
  const [postingText, setPostingText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    if (!title.trim() || !company.trim()) {
      setError("Title and company are required.");
      return;
    }
    setSaving(true);
    setError(null);
    const result = await createApplicationAction({
      title,
      company,
      role,
      location,
      postingText,
      currency: "INR",
      mode: "",
      salary: "",
      postingUrl: "",
      tone: "WARM",
      language: "",
    });
    setSaving(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setTitle("");
    setCompany("");
    setRole("");
    setLocation("");
    setPostingText("");
    if (onCreated) onCreated();
    else window.location.reload();
  }

  return (
    <section className="card" aria-labelledby="application-editor-heading">
      <h2 id="application-editor-heading">New application</h2>
      <div style={{ display: "grid", gap: "8px" }}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" aria-label="Title" />
        <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company" aria-label="Company" />
        <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Role (optional)" aria-label="Role" />
        <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location (optional)" aria-label="Location" />
        <textarea
          value={postingText}
          onChange={(e) => setPostingText(e.target.value)}
          placeholder="Paste the posting text (optional)"
          rows={4}
          aria-label="Posting text"
        />
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button type="button" onClick={handleAdd} className="button" disabled={saving}>
            {saving ? "Creating..." : "Create draft"}
          </button>
          {error ? <span className="error">{error}</span> : null}
        </div>
      </div>
    </section>
  );
}
