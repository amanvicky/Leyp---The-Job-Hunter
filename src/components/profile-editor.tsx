"use client";

import { useState } from "react";
import { addSkillAction, addExperienceAction, addEducationAction, addLanguageAction } from "@/lib/actions/profile";
import { importResumeAction } from "@/lib/actions/import-resume";

export function ProfileEditor() {
  const [importText, setImportText] = useState("");
  const [importResult, setImportResult] = useState<string | null>(null);
  const [skillName, setSkillName] = useState("");
  const [expRole, setExpRole] = useState("");
  const [expCompany, setExpCompany] = useState("");
  const [eduDegree, setEduDegree] = useState("");
  const [eduSchool, setEduSchool] = useState("");
  const [langName, setLangName] = useState("");
  const [langLevel, setLangLevel] = useState("B2");

  async function handleImport() {
    const result = await importResumeAction({ text: importText });
    if (result.ok) setImportResult(`Imported: ${result.data.fields.join(", ") || "no fields detected"}`);
    else setImportResult(result.error);
  }

  async function handleAddSkill() {
    if (!skillName.trim()) return;
    await addSkillAction({ name: skillName });
    setSkillName("");
    window.location.reload();
  }

  async function handleAddExperience() {
    if (!expRole.trim() || !expCompany.trim()) return;
    await addExperienceAction({ role: expRole, company: expCompany });
    setExpRole("");
    setExpCompany("");
    window.location.reload();
  }

  async function handleAddEducation() {
    if (!eduDegree.trim() || !eduSchool.trim()) return;
    await addEducationAction({ degree: eduDegree, school: eduSchool });
    setEduDegree("");
    setEduSchool("");
    window.location.reload();
  }

  async function handleAddLanguage() {
    if (!langName.trim()) return;
    await addLanguageAction({ name: langName, level: langLevel as "NATIVE" | "C2" | "C1" | "B2" | "B1" | "A2" | "A1" });
    setLangName("");
    window.location.reload();
  }

  return (
    <div className="profile-editor">
      <section className="card">
        <h2>Import resume</h2>
        <textarea
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder="Paste your resume text here..."
          rows={8}
          style={{ width: "100%", fontFamily: "inherit", padding: "8px", border: "1px solid var(--line)", borderRadius: "8px" }}
        />
        <button type="button" onClick={handleImport} className="button" style={{ marginTop: "8px" }}>
          Import
        </button>
        {importResult ? <p className="muted">{importResult}</p> : null}
      </section>

      <section className="card">
        <h2>Add skill</h2>
        <div style={{ display: "flex", gap: "8px" }}>
          <input value={skillName} onChange={(e) => setSkillName(e.target.value)} placeholder="Skill name" />
          <button type="button" onClick={handleAddSkill} className="button">Add</button>
        </div>
      </section>

      <section className="card">
        <h2>Add experience</h2>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <input value={expRole} onChange={(e) => setExpRole(e.target.value)} placeholder="Role" />
          <input value={expCompany} onChange={(e) => setExpCompany(e.target.value)} placeholder="Company" />
          <button type="button" onClick={handleAddExperience} className="button">Add</button>
        </div>
      </section>

      <section className="card">
        <h2>Add education</h2>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <input value={eduDegree} onChange={(e) => setEduDegree(e.target.value)} placeholder="Degree" />
          <input value={eduSchool} onChange={(e) => setEduSchool(e.target.value)} placeholder="School" />
          <button type="button" onClick={handleAddEducation} className="button">Add</button>
        </div>
      </section>

      <section className="card">
        <h2>Add language</h2>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <input value={langName} onChange={(e) => setLangName(e.target.value)} placeholder="Language" />
          <select value={langLevel} onChange={(e) => setLangLevel(e.target.value)} style={{ padding: "8px", border: "1px solid var(--line)", borderRadius: "8px" }}>
            <option value="NATIVE">Native</option>
            <option value="C2">C2</option>
            <option value="C1">C1</option>
            <option value="B2">B2</option>
            <option value="B1">B1</option>
            <option value="A2">A2</option>
            <option value="A1">A1</option>
          </select>
          <button type="button" onClick={handleAddLanguage} className="button">Add</button>
        </div>
      </section>
    </div>
  );
}
