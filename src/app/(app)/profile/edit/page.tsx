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
        Strength: {s.score}/100 ({s.label}). Everything here stays on this machine.
      </p>

      <ProfileEditor
        data={{
          fields: data.fields,
          skills: data.skills.map((skill) => ({
            id: skill.id,
            name: skill.name,
            label: skill.label,
            group: skill.group,
          })),
          experiences: data.experiences.map((experience) => ({
            id: experience.id,
            role: experience.role,
            company: experience.company,
          })),
          projects: data.projects.map((project) => ({ id: project.id, name: project.name })),
          educations: data.educations.map((education) => ({
            id: education.id,
            degree: education.degree,
            school: education.school,
          })),
          languages: data.languages.map((language) => ({
            id: language.id,
            name: language.name,
            level: language.level,
          })),
          publications: data.publications.map((publication) => ({
            id: publication.id,
            citation: publication.citation,
          })),
          references: data.references.map((reference) => ({ id: reference.id, name: reference.name })),
          facts: data.facts.map((fact) => ({ id: fact.id, text: fact.text })),
        }}
      />

      <p style={{ marginTop: "24px" }}>
        <a href="/resume" className="button">
          Preview and download the resume
        </a>
      </p>
    </div>
  );
}
