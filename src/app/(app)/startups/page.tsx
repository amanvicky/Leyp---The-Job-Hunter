import { verifySession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Startups · Leyp" };

function parseList(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export default async function StartupsPage() {
  await verifySession();

  const startups = await prisma.startup.findMany({
    where: { status: { in: ["NEW", "SAVED"] } },
    orderBy: [{ score: "desc" }, { seenAt: "desc" }],
    take: 50,
  });

  return (
    <div className="page">
      <h1>Startups</h1>
      <p className="muted">
        Companies worth a cold note, gathered from the startup sources. Nothing is contacted without you.
      </p>

      {startups.length === 0 ? (
        <p className="muted">
          Nothing here yet. Startups appear once a startup source has been scanned.
        </p>
      ) : (
        <ul className="list-plain">
          {startups.map((startup) => {
            const roles = parseList(startup.roles);
            const emails = parseList(startup.emails);
            const links = parseList(startup.links);
            return (
              <li key={startup.id} className="card">
                <h2>
                  {startup.website ? (
                    <a href={startup.website} target="_blank" rel="noreferrer">
                      {startup.company}
                    </a>
                  ) : (
                    startup.company
                  )}
                </h2>
                <p className="muted">
                  {[startup.location, startup.stage, startup.remote === true ? "Remote" : ""]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {startup.summary ? <p>{startup.summary}</p> : null}
                {roles.length > 0 ? (
                  <>
                    <p className="muted">Roles</p>
                    <ul>
                      {roles.map((role, index) => (
                        <li key={index}>{role}</li>
                      ))}
                    </ul>
                  </>
                ) : null}
                {emails.length > 0 ? (
                  <>
                    <p className="muted">Published addresses</p>
                    <ul>
                      {emails.map((email, index) => (
                        <li key={index}>
                          <a href={`mailto:${email}`}>{email}</a>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}
                {links.length > 0 ? (
                  <p className="muted">
                    {links.map((link, index) => (
                      <span key={index}>
                        {index > 0 ? " · " : null}
                        <a href={link} target="_blank" rel="noreferrer">
                          {link}
                        </a>
                      </span>
                    ))}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
