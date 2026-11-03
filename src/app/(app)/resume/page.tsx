import { verifySession } from "@/lib/auth/session";
import { getResumePageData } from "@/lib/actions/resume-page";
import { ResumePreview } from "@/components/resume-preview";

export const metadata = { title: "Resume · Leyp" };

export default async function ResumePage() {
  await verifySession();
  const result = await getResumePageData({});

  if (!result.ok) {
    return (
      <div className="page">
        <h1>Resume</h1>
        <p className="muted">Could not load your resume.</p>
      </div>
    );
  }

  const { themes, defaultThemeId, defaultHtml } = result.data;

  return (
    <div className="page">
      <h1>Resume</h1>
      <p className="muted">
        Built from your profile. Pick a theme, then download the PDF. Nothing is sent anywhere.
      </p>
      <ResumePreview themes={themes} initialThemeId={defaultThemeId} initialHtml={defaultHtml} />
    </div>
  );
}
