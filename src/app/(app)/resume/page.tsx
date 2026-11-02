import { verifySession } from "@/lib/auth/session";
import { getResumePageData } from "@/lib/actions/resume-page";

export const metadata = { title: "Resume · Leyp" };

export default async function ResumePage() {
  await verifySession();
  const result = await getResumePageData({});

  if (!result.ok) {
    return (
      <div className="page">
        <h1>Resume</h1>
        <p className="muted">Could not load resume data.</p>
      </div>
    );
  }

  const { themes, applications } = result.data;

  return (
    <div className="page">
      <h1>Resume</h1>
      <p className="muted">Pick a theme and an application to render a PDF.</p>

      <section className="card">
        <h2>Themes ({themes.length})</h2>
        <ul>
          {themes.map((theme) => (
            <li key={theme.id}>
              {theme.name} — {theme.headFont} / {theme.bodyFont}
              {theme.builtIn ? " (built-in)" : ""}
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2>Applications ({applications.length})</h2>
        {applications.length === 0 ? (
          <p className="muted">No applications yet. Create one to render a resume.</p>
        ) : (
          <ul>
            {applications.map((app) => (
              <li key={app.id}>
                {app.title || "Untitled"} · {app.company || "—"}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
