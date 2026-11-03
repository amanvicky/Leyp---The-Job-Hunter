import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";
import { ThemeBuilder } from "@/components/theme-builder";

export const metadata = { title: "Themes · Leyp" };

export default async function ThemesPage() {
  await verifySession();
  const themes = await prisma.theme.findMany({ orderBy: [{ builtIn: "desc" }, { name: "asc" }] });

  return (
    <div className="page">
      <h1>Themes</h1>
      <p className="muted">Six built-in themes and your own. Build custom themes with live preview.</p>
      <ThemeBuilder themes={themes} />
    </div>
  );
}