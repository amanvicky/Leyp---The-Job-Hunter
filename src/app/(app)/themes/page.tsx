import { prisma } from "@/lib/prisma";

export const metadata = { title: "Themes · Leyp" };

export default async function ThemesPage() {
  const themes = await prisma.theme.findMany({ orderBy: [{ builtIn: "desc" }, { name: "asc" }] });

  return (
    <div className="page">
      <h1>Themes</h1>
      <p className="muted">Six built-in themes and your own. Pick one for each document.</p>

      <div className="theme-grid">
        {themes.map((theme) => (
          <article key={theme.id} className="theme-card">
            <header>
              <h2>{theme.name}</h2>
              {theme.builtIn ? <span className="badge">Built-in</span> : null}
            </header>
            <div className="theme-swatch" style={{ background: theme.accent }} />
            <dl>
              <dt>Heading</dt>
              <dd>{theme.headFont}</dd>
              <dt>Body</dt>
              <dd>{theme.bodyFont}</dd>
              <dt>Layout</dt>
              <dd>{theme.layout}</dd>
            </dl>
          </article>
        ))}
      </div>
    </div>
  );
}
