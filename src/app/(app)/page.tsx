import { prisma } from "@/lib/prisma";

export const metadata = { title: "Dashboard · Leyp" };

export default async function DashboardPage() {
  const [applications, awaitingReview, profileFields] = await Promise.all([
    prisma.application.count({ where: { awaitingReview: false } }),
    prisma.application.count({ where: { awaitingReview: true } }),
    prisma.profileField.count(),
  ]);

  const profileStarted = profileFields > 0;

  return (
    <div className="page">
      <h1>Dashboard</h1>
      <p className="muted">Your job search, on your own machine.</p>

      <div className="grid">
        <section className="card" aria-labelledby="apps-heading">
          <h2 id="apps-heading">Applications</h2>
          <p className="stat">{applications}</p>
          {awaitingReview > 0 ? (
            <p className="muted">
              {awaitingReview} draft{awaitingReview === 1 ? "" : "s"} waiting for your review.
            </p>
          ) : null}
        </section>

        <section className="card" aria-labelledby="profile-heading">
          <h2 id="profile-heading">Profile</h2>
          {profileStarted ? (
            <p>Your profile has {profileFields} field{profileFields === 1 ? "" : "s"} filled in.</p>
          ) : (
            <p className="muted">No profile yet. Start with your basics and a few skills.</p>
          )}
        </section>
      </div>

      {!profileStarted ? (
        <section className="card" aria-labelledby="next-heading">
          <h2 id="next-heading">Start here</h2>
          <ol>
            <li>Fill in your profile — basics, skills and one role is enough to begin.</li>
            <li>Paste a job posting into a new application.</li>
            <li>Review the match and the tailored documents before you send anything.</li>
          </ol>
        </section>
      ) : null}
    </div>
  );
}
