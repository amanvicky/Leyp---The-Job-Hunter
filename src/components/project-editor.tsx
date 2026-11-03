"use client";

import { useState } from "react";
import { addProjectAction } from "@/lib/actions/profile";

export function ProjectEditor() {
  const [name, setName] = useState("");
  const [link, setLink] = useState("");

  async function handleAdd() {
    if (!name.trim()) return;
    const result = await addProjectAction({ name, link });
    setName("");
    setLink("");
    if (result.ok) window.location.reload();
  }

  return (
    <section className="card">
      <h2>Add project</h2>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Project name" />
        <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Link (optional)" />
        <button type="button" onClick={handleAdd} className="button">Add</button>
      </div>
    </section>
  );
}
