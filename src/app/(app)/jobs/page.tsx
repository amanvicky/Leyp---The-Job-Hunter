import { verifySession } from "@/lib/auth/session";
import { JobSearch } from "@/components/job-search";

export const metadata = { title: "Find jobs · Leyp" };

export default async function JobsPage() {
  await verifySession();

  return (
    <div className="page">
      <h1>Find jobs</h1>
      <p className="muted">
        Searches run through the source you have keys for. Results are cached for thirty minutes, so a
        second search of the same words costs no quota.
      </p>

      <JobSearch />

      <section className="card" style={{ marginTop: "16px" }}>
        <h2>Keys</h2>
        <p className="muted">
          Add or replace a source key in <a href="/settings">Settings</a>. Keys are stored on this machine
          and never sent to the browser.
        </p>
      </section>
    </div>
  );
}
