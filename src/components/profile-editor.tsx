"use client";

import { useState, useTransition } from "react";
import {
  addEducationAction,
  addExperienceAction,
  addFactAction,
  addLanguageAction,
  addProjectAction,
  addPublicationAction,
  addReferenceAction,
  addSkillAction,
  deleteEducationAction,
  deleteExperienceAction,
  deleteFactAction,
  deleteLanguageAction,
  deleteProjectAction,
  deletePublicationAction,
  deleteReferenceAction,
  deleteSkillAction,
  saveBasicsAction,
} from "@/lib/actions/profile";
import { importResumeAction } from "@/lib/actions/import-resume";

const LEVELS = ["NATIVE", "C2", "C1", "B2", "B1", "A2", "A1"] as const;

export interface ProfileEditorData {
  fields: Record<string, string>;
  skills: { id: string; name: string; label: string; group: string }[];
  experiences: { id: string; role: string; company: string }[];
  projects: { id: string; name: string }[];
  educations: { id: string; degree: string; school: string }[];
  languages: { id: string; name: string; level: string }[];
  publications: { id: string; citation: string }[];
  references: { id: string; name: string }[];
  facts: { id: string; text: string }[];
}

const inputStyle = { width: "100%", padding: "8px", border: "1px solid var(--line)", borderRadius: "8px" } as const;

export function ProfileEditor({ data }: { data: ProfileEditorData }) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [basics, setBasics] = useState({
    name: data.fields.name ?? "",
    email: data.fields.email ?? "",
    phone: data.fields.phone ?? "",
    location: data.fields.location ?? "",
    headline: data.fields.headline ?? "",
    summary: data.fields.summary ?? "",
    linkedin: data.fields.linkedin ?? "",
    github: data.fields.github ?? "",
    website: data.fields.website ?? "",
  });

  const [resumeText, setResumeText] = useState("");
  const [skill, setSkill] = useState({ name: "", group: "" });
  const [experience, setExperience] = useState({
    role: "",
    company: "",
    location: "",
    startYear: "",
    endYear: "",
    current: false,
    bullets: "",
  });
  const [project, setProject] = useState({ name: "", link: "", bullets: "" });
  const [education, setEducation] = useState({ degree: "", school: "", startYear: "", endYear: "" });
  const [language, setLanguage] = useState<{ name: string; level: (typeof LEVELS)[number] }>({ name: "", level: "B2" });
  const [publication, setPublication] = useState({ citation: "", link: "" });
  const [reference, setReference] = useState({ name: "", relation: "", company: "", email: "" });
  const [fact, setFact] = useState("");

  /** One place to turn an action result into user-visible feedback. */
  async function run(work: () => Promise<{ ok: boolean; error?: string }>, done: string) {
    setError(null);
    setMessage(null);
    const result = await work();
    if (!result.ok) {
      setError(result.error ?? "That did not work.");
      return false;
    }
    setMessage(done);
    return true;
  }

  const year = (value: string) => (value.trim() ? Number(value) : null);

  return (
    <div className="profile-editor">
      <section className="card" aria-labelledby="basics-form">
        <h2 id="basics-form">Basics</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          {(
            [
              ["name", "Name"],
              ["email", "Email"],
              ["phone", "Phone"],
              ["location", "Location"],
              ["headline", "Headline"],
              ["linkedin", "LinkedIn"],
              ["github", "GitHub"],
              ["website", "Website"],
            ] as const
          ).map(([key, label]) => (
            <label key={key}>
              <span className="muted" style={{ display: "block", marginBottom: "4px" }}>
                {label}
              </span>
              <input
                value={basics[key]}
                onChange={(event) => setBasics({ ...basics, [key]: event.target.value })}
                style={inputStyle}
                aria-label={label}
              />
            </label>
          ))}
        </div>
        <label style={{ display: "block", marginTop: "8px" }}>
          <span className="muted" style={{ display: "block", marginBottom: "4px" }}>
            Summary
          </span>
          <textarea
            value={basics.summary}
            onChange={(event) => setBasics({ ...basics, summary: event.target.value })}
            rows={3}
            style={inputStyle}
            aria-label="Summary"
          />
        </label>
        <button
          type="button"
          className="button"
          disabled={pending}
          style={{ marginTop: "12px" }}
          onClick={() =>
            startTransition(async () => {
              await run(() => saveBasicsAction(basics), "Basics saved.");
            })
          }
        >
          Save basics
        </button>
      </section>

      <section className="card" aria-labelledby="import-form">
        <h2 id="import-form">Import resume text</h2>
        <p className="muted">
          Paste your resume. Nothing leaves this machine.
        </p>
        <textarea
          value={resumeText}
          onChange={(event) => setResumeText(event.target.value)}
          rows={8}
          placeholder="Paste your resume here…"
          style={inputStyle}
          aria-label="Resume text"
        />
        <button
          type="button"
          className="button"
          disabled={pending || resumeText.trim().length === 0}
          style={{ marginTop: "8px" }}
          onClick={() =>
            startTransition(async () => {
              const result = await importResumeAction({ text: resumeText, replaceExisting: false });
              if (!result.ok) {
                setError(result.error);
                return;
              }
              setResumeText("");
              const { counts, warnings, wroteNothing } = result.data;
              if (wroteNothing) {
                setError("Nothing recognisable was found in that text. Nothing was changed.");
                return;
              }
              const parts = [
                counts.fields > 0 ? `${counts.fields} contact field${counts.fields === 1 ? "" : "s"}` : null,
                counts.skills > 0 ? `${counts.skills} skill${counts.skills === 1 ? "" : "s"}` : null,
                counts.experiences > 0 ? `${counts.experiences} role${counts.experiences === 1 ? "" : "s"}` : null,
                counts.projects > 0 ? `${counts.projects} project${counts.projects === 1 ? "" : "s"}` : null,
                counts.educations > 0 ? `${counts.educations} education entr${counts.educations === 1 ? "y" : "ies"}` : null,
                counts.languages > 0 ? `${counts.languages} language${counts.languages === 1 ? "" : "s"}` : null,
              ].filter(Boolean);
              setMessage(
                `Imported ${parts.join(", ")}.${warnings.length > 0 ? ` ${warnings.join(" ")}` : ""} Reload to see it below.`,
              );
            })
          }
        >
          Import
        </button>
      </section>

      <section className="card" aria-labelledby="skill-form">
        <h2 id="skill-form">Skills ({data.skills.length})</h2>
        <ul className="tag-list">
          {data.skills.map((item) => (
            <li key={item.id}>
              {item.label || item.name}
              {item.group ? <span className="muted"> · {item.group}</span> : null}{" "}
              <button
                type="button"
                className="button secondary"
                aria-label={`Remove ${item.label || item.name}`}
                onClick={() =>
                  startTransition(async () => {
                    await run(() => deleteSkillAction({ id: item.id }), "Skill removed.");
                  })
                }
              >
                ×
              </button>
            </li>
          ))}
        </ul>
        <div style={{ display: "flex", gap: "8px", marginTop: "8px", flexWrap: "wrap" }}>
          <input
            value={skill.name}
            onChange={(event) => setSkill({ ...skill, name: event.target.value })}
            placeholder="Skill, e.g. TypeScript"
            aria-label="Skill name"
            style={{ flex: "1 1 180px", padding: "8px", border: "1px solid var(--line)", borderRadius: "8px" }}
          />
          <input
            value={skill.group}
            onChange={(event) => setSkill({ ...skill, group: event.target.value })}
            placeholder="Group (optional)"
            aria-label="Skill group"
            style={{ flex: "1 1 140px", padding: "8px", border: "1px solid var(--line)", borderRadius: "8px" }}
          />
          <button
            type="button"
            className="button"
            disabled={pending || skill.name.trim().length === 0}
            onClick={() =>
              startTransition(async () => {
                const ok = await run(
                  () => addSkillAction({ name: skill.name, group: skill.group.trim() || undefined }),
                  "Skill added.",
                );
                if (ok) setSkill({ name: "", group: "" });
              })
            }
          >
            Add
          </button>
        </div>
      </section>

      <section className="card" aria-labelledby="experience-form">
        <h2 id="experience-form">Experience ({data.experiences.length})</h2>
        <ul>
          {data.experiences.map((item) => (
            <li key={item.id}>
              {item.role || "Untitled role"}
              {item.company ? ` · ${item.company}` : ""}{" "}
              <button
                type="button"
                className="button secondary"
                aria-label={`Remove ${item.role || "role"}`}
                onClick={() =>
                  startTransition(async () => {
                    await run(() => deleteExperienceAction({ id: item.id }), "Role removed.");
                  })
                }
              >
                ×
              </button>
            </li>
          ))}
        </ul>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "8px" }}>
          <input value={experience.role} onChange={(e) => setExperience({ ...experience, role: e.target.value })} placeholder="Role" aria-label="Role" style={inputStyle} />
          <input value={experience.company} onChange={(e) => setExperience({ ...experience, company: e.target.value })} placeholder="Company" aria-label="Company" style={inputStyle} />
          <input value={experience.location} onChange={(e) => setExperience({ ...experience, location: e.target.value })} placeholder="Location" aria-label="Location" style={inputStyle} />
          <input value={experience.startYear} onChange={(e) => setExperience({ ...experience, startYear: e.target.value })} placeholder="Start year" aria-label="Start year" style={inputStyle} />
          <input value={experience.endYear} onChange={(e) => setExperience({ ...experience, endYear: e.target.value })} placeholder="End year" aria-label="End year" style={inputStyle} />
          <label style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <input type="checkbox" checked={experience.current} onChange={(e) => setExperience({ ...experience, current: e.target.checked })} aria-label="Current role" />
            <span className="muted">Current role</span>
          </label>
        </div>
        <textarea
          value={experience.bullets}
          onChange={(e) => setExperience({ ...experience, bullets: e.target.value })}
          rows={4}
          placeholder="One achievement per line"
          aria-label="Achievements"
          style={{ ...inputStyle, marginTop: "8px" }}
        />
        <button
          type="button"
          className="button"
          disabled={pending || !experience.role.trim() || !experience.company.trim()}
          style={{ marginTop: "8px" }}
          onClick={() =>
            startTransition(async () => {
              const ok = await run(
                () =>
                  addExperienceAction({
                    role: experience.role,
                    company: experience.company,
                    location: experience.location,
                    descriptor: "",
                    startYear: year(experience.startYear),
                    endYear: year(experience.endYear),
                    current: experience.current,
                    bullets: experience.bullets,
                    skillIds: [],
                  }),
                "Role added.",
              );
              if (ok) setExperience({ role: "", company: "", location: "", startYear: "", endYear: "", current: false, bullets: "" });
            })
          }
        >
          Add role
        </button>
      </section>

      <section className="card" aria-labelledby="project-form">
        <h2 id="project-form">Projects ({data.projects.length})</h2>
        <ul>
          {data.projects.map((item) => (
            <li key={item.id}>
              {item.name || "Unnamed project"}{" "}
              <button
                type="button"
                className="button secondary"
                aria-label={`Remove ${item.name || "project"}`}
                onClick={() =>
                  startTransition(async () => {
                    await run(() => deleteProjectAction({ id: item.id }), "Project removed.");
                  })
                }
              >
                ×
              </button>
            </li>
          ))}
        </ul>
        <div style={{ display: "flex", gap: "8px", marginTop: "8px", flexWrap: "wrap" }}>
          <input value={project.name} onChange={(e) => setProject({ ...project, name: e.target.value })} placeholder="Project name" aria-label="Project name" style={{ flex: "1 1 180px", padding: "8px", border: "1px solid var(--line)", borderRadius: "8px" }} />
          <input value={project.link} onChange={(e) => setProject({ ...project, link: e.target.value })} placeholder="Link" aria-label="Project link" style={{ flex: "1 1 180px", padding: "8px", border: "1px solid var(--line)", borderRadius: "8px" }} />
          <button
            type="button"
            className="button"
            disabled={pending || !project.name.trim()}
            onClick={() =>
              startTransition(async () => {
                const ok = await run(
                  () => addProjectAction({ name: project.name, link: project.link, bullets: project.bullets, current: false, skillIds: [] }),
                  "Project added.",
                );
                if (ok) setProject({ name: "", link: "", bullets: "" });
              })
            }
          >
            Add
          </button>
        </div>
        <textarea
          value={project.bullets}
          onChange={(e) => setProject({ ...project, bullets: e.target.value })}
          rows={3}
          placeholder="What you built, one line each"
          aria-label="Project details"
          style={{ ...inputStyle, marginTop: "8px" }}
        />
      </section>

      <section className="card" aria-labelledby="education-form">
        <h2 id="education-form">Education ({data.educations.length})</h2>
        <ul>
          {data.educations.map((item) => (
            <li key={item.id}>
              {item.degree || "Degree"} · {item.school || "School"}{" "}
              <button
                type="button"
                className="button secondary"
                aria-label={`Remove ${item.degree || "education"}`}
                onClick={() =>
                  startTransition(async () => {
                    await run(() => deleteEducationAction({ id: item.id }), "Education removed.");
                  })
                }
              >
                ×
              </button>
            </li>
          ))}
        </ul>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "8px" }}>
          <input value={education.degree} onChange={(e) => setEducation({ ...education, degree: e.target.value })} placeholder="Degree" aria-label="Degree" style={inputStyle} />
          <input value={education.school} onChange={(e) => setEducation({ ...education, school: e.target.value })} placeholder="School" aria-label="School" style={inputStyle} />
          <input value={education.startYear} onChange={(e) => setEducation({ ...education, startYear: e.target.value })} placeholder="Start year" aria-label="Education start year" style={inputStyle} />
          <input value={education.endYear} onChange={(e) => setEducation({ ...education, endYear: e.target.value })} placeholder="End year" aria-label="Education end year" style={inputStyle} />
        </div>
        <button
          type="button"
          className="button"
          disabled={pending || (!education.degree.trim() && !education.school.trim())}
          style={{ marginTop: "8px" }}
          onClick={() =>
            startTransition(async () => {
              const ok = await run(
                () =>
                  addEducationAction({
                    degree: education.degree,
                    school: education.school,
                    startYear: year(education.startYear),
                    endYear: year(education.endYear),
                    current: false,
                    notes: "",
                  }),
                "Education added.",
              );
              if (ok) setEducation({ degree: "", school: "", startYear: "", endYear: "" });
            })
          }
        >
          Add education
        </button>
      </section>

      <section className="card" aria-labelledby="language-form">
        <h2 id="language-form">Languages ({data.languages.length})</h2>
        <ul>
          {data.languages.map((item) => (
            <li key={item.id}>
              {item.name} · {item.level}{" "}
              <button
                type="button"
                className="button secondary"
                aria-label={`Remove ${item.name}`}
                onClick={() =>
                  startTransition(async () => {
                    await run(() => deleteLanguageAction({ id: item.id }), "Language removed.");
                  })
                }
              >
                ×
              </button>
            </li>
          ))}
        </ul>
        <div style={{ display: "flex", gap: "8px", marginTop: "8px", flexWrap: "wrap" }}>
          <input value={language.name} onChange={(e) => setLanguage({ ...language, name: e.target.value })} placeholder="Language" aria-label="Language" style={{ flex: "1 1 160px", padding: "8px", border: "1px solid var(--line)", borderRadius: "8px" }} />
          <select
            value={language.level}
            onChange={(e) => setLanguage({ ...language, level: e.target.value as (typeof LEVELS)[number] })}
            aria-label="Level"
            style={{ padding: "8px", border: "1px solid var(--line)", borderRadius: "8px" }}
          >
            {LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="button"
            disabled={pending || !language.name.trim()}
            onClick={() =>
              startTransition(async () => {
                const ok = await run(() => addLanguageAction({ name: language.name, level: language.level }), "Language added.");
                if (ok) setLanguage({ name: "", level: "B2" });
              })
            }
          >
            Add
          </button>
        </div>
      </section>

      <section className="card" aria-labelledby="publication-form">
        <h2 id="publication-form">Publications ({data.publications.length})</h2>
        <ul>
          {data.publications.map((item) => (
            <li key={item.id}>
              {item.citation}{" "}
              <button
                type="button"
                className="button secondary"
                aria-label={`Remove ${item.citation}`}
                onClick={() =>
                  startTransition(async () => {
                    await run(() => deletePublicationAction({ id: item.id }), "Publication removed.");
                  })
                }
              >
                ×
              </button>
            </li>
          ))}
        </ul>
        <div style={{ display: "flex", gap: "8px", marginTop: "8px", flexWrap: "wrap" }}>
          <input value={publication.citation} onChange={(e) => setPublication({ ...publication, citation: e.target.value })} placeholder="Citation" aria-label="Citation" style={{ flex: "2 1 240px", padding: "8px", border: "1px solid var(--line)", borderRadius: "8px" }} />
          <input value={publication.link} onChange={(e) => setPublication({ ...publication, link: e.target.value })} placeholder="Link" aria-label="Publication link" style={{ flex: "1 1 160px", padding: "8px", border: "1px solid var(--line)", borderRadius: "8px" }} />
          <button
            type="button"
            className="button"
            disabled={pending || !publication.citation.trim()}
            onClick={() =>
              startTransition(async () => {
                const ok = await run(() => addPublicationAction({ citation: publication.citation, link: publication.link, onResumes: true }), "Publication added.");
                if (ok) setPublication({ citation: "", link: "" });
              })
            }
          >
            Add
          </button>
        </div>
      </section>

      <section className="card" aria-labelledby="reference-form">
        <h2 id="reference-form">References ({data.references.length})</h2>
        <ul>
          {data.references.map((item) => (
            <li key={item.id}>
              {item.name || "Unnamed reference"}{" "}
              <button
                type="button"
                className="button secondary"
                aria-label={`Remove ${item.name || "reference"}`}
                onClick={() =>
                  startTransition(async () => {
                    await run(() => deleteReferenceAction({ id: item.id }), "Reference removed.");
                  })
                }
              >
                ×
              </button>
            </li>
          ))}
        </ul>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "8px" }}>
          <input value={reference.name} onChange={(e) => setReference({ ...reference, name: e.target.value })} placeholder="Name" aria-label="Reference name" style={inputStyle} />
          <input value={reference.relation} onChange={(e) => setReference({ ...reference, relation: e.target.value })} placeholder="Relationship" aria-label="Reference relationship" style={inputStyle} />
          <input value={reference.company} onChange={(e) => setReference({ ...reference, company: e.target.value })} placeholder="Company" aria-label="Reference company" style={inputStyle} />
          <input value={reference.email} onChange={(e) => setReference({ ...reference, email: e.target.value })} placeholder="Email" aria-label="Reference email" style={inputStyle} />
        </div>
        <button
          type="button"
          className="button"
          disabled={pending || !reference.name.trim()}
          style={{ marginTop: "8px" }}
          onClick={() =>
            startTransition(async () => {
              const ok = await run(
                () => addReferenceAction({ ...reference, phone: "" }),
                "Reference added.",
              );
              if (ok) setReference({ name: "", relation: "", company: "", email: "" });
            })
          }
        >
          Add reference
        </button>
      </section>

      <section className="card" aria-labelledby="fact-form">
        <h2 id="fact-form">Facts for the AI ({data.facts.length})</h2>
        <p className="muted">
          Things worth remembering that are not on the resume. These are never printed on a document.
        </p>
        <ul>
          {data.facts.map((item) => (
            <li key={item.id}>
              {item.text}{" "}
              <button
                type="button"
                className="button secondary"
                aria-label={`Remove ${item.text}`}
                onClick={() =>
                  startTransition(async () => {
                    await run(() => deleteFactAction({ id: item.id }), "Fact removed.");
                  })
                }
              >
                ×
              </button>
            </li>
          ))}
        </ul>
        <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
          <input
            value={fact}
            onChange={(e) => setFact(e.target.value)}
            placeholder="e.g. I need four weeks notice"
            aria-label="Fact"
            style={{ flex: 1, padding: "8px", border: "1px solid var(--line)", borderRadius: "8px" }}
          />
          <button
            type="button"
            className="button"
            disabled={pending || !fact.trim()}
            onClick={() =>
              startTransition(async () => {
                const ok = await run(() => addFactAction({ text: fact, applicationId: null }), "Fact saved.");
                if (ok) setFact("");
              })
            }
          >
            Add
          </button>
        </div>
      </section>

      <div aria-live="polite" style={{ minHeight: "24px" }}>
        {error ? <p className="error">{error}</p> : message ? <p className="muted">{message}</p> : null}
      </div>
    </div>
  );
}
