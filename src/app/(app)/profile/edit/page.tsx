import { verifySession } from "@/lib/auth/session";
import { getProfilePageData } from "@/lib/actions/profile-page";
import { getProfileStrengthAction } from "@/lib/actions/profile-strength";
import { ProfileEditor } from "@/components/profile-editor";

export const metadata = { title: "Edit Profile · Leyp" };

export default async function ProfileEditPage() {
  await verifySession();
  const result = await getProfilePageData({});
  const strength = await getProfileStrengthAction({});

  if (!result.ok || !strength.ok) {
    return (
      <div className="page">
        <h1>Edit Profile</h1>
        <p className="muted">Could not load your profile. Please try again.</p>
      </div>
    );
  }

  const data = result.data;
  const s = strength.data;

  return (
    <div className="page">
      <h1>Edit Profile</h1>
      <p className="muted">
        Strength: {s.score}/100 ({s.label}).
      </p>

      <ProfileEditor />

      <hr style={{ margin: "32px 0", borderColor: "var(--line)" }} />

      <h2>Current Data</h2>
      <div className="profile-grid">
        <section className="card" aria-labelledby="basics-heading">
          <h2 id="basics-heading">Basics</h2>
          <dl>
            <dt>Name</dt>
            <dd>{data.fields.name || "—"}</dd>
            <dt>Email</dt>
            <dd>{data.fields.email || "—"}</dd>
            <dt>Headline</dt>
            <dd>{data.fields.headline || "—"}</dd>
            <dt>Location</dt>
            <dd>{data.fields.location || "—"}</dd>
          </dl>
        </section>

        <section className="card" aria-labelledby="skills-heading">
          <h2 id="skills-heading">Skills ({data.skills.length})</h2>
          <ul className="tag-list">
            {data.skills.map((skill) => (
              <li key={skill.id}>
                {skill.label || skill.name}
                {skill.group ? <span className="muted"> · {skill.group}</span> : null}
              </li>
            ))}
          </ul>
        </section>

        <section className="card" aria-labelledby="experience-heading">
          <h2 id="experience-heading">Experience ({data.experiences.length})</h2>
          {data.experiences.length === 0 ? (
            <p className="muted">No roles yet.</p>
          ) : (
            <ul>
              {data.experiences.map((exp) => (
                <li key={exp.id}>
                  <strong>{exp.role || "Untitled role"}</strong>
                  {exp.company ? ` · ${exp.company}` : ""}
                  {exp.startYear ? ` · ${exp.startYear}` : ""}
                  {exp.current ? " – Present" : exp.endYear ? ` – ${exp.endYear}` : ""}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card" aria-labelledby="education-heading">
          <h2 id="education-heading">Education ({data.educations.length})</h2>
          {data.educations.length === 0 ? (
            <p className="muted">No education entries yet.</p>
          ) : (
            <ul>
              {data.educations.map((edu) => (
                <li key={edu.id}>
                  {edu.degree || "Degree"} · {edu.school || "School"}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card" aria-labelledby="projects-heading">
          <h2 id="projects-heading">Projects ({data.projects.length})</h2>
          {data.projects.length === 0 ? (
            <p className="muted">No projects yet.</p>
          ) : (
            <ul>
              {data.projects.map((proj) => (
                <li key={proj.id}>{proj.name || "Unnamed project"}</li>
              ))}
            </ul>
          )}
        </section>

        <section className="card" aria-labelledby="languages-heading">
          <h2 id="languages-heading">Languages ({data.languages.length})</h2>
          {data.languages.length === 0 ? (
            <p className="muted">No languages yet.</p>
          ) : (
            <ul>
              {data.languages.map((lang) => (
                <li key={lang.id}>
                  {lang.name} · {lang.level}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}