import { verifySession } from "@/lib/auth/session";
import { getResumePageData } from "@/lib/actions/resume-page";
import { ResumeRenderer } from "@/components/resume-renderer";

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
      <ResumeRenderer themes={themes} applications={applications} />
    </div>
  );
}