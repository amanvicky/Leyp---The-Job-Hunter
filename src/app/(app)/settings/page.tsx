import { prisma } from "@/lib/prisma";

export const metadata = { title: "Settings · Leyp" };

export default async function SettingsPage() {
  const settings = await prisma.setting.findMany({ orderBy: { key: "asc" } });

  return (
    <div className="page">
      <h1>Settings</h1>
      <p className="muted">Editable settings arrive with the AI provider and search screens.</p>

      {settings.length === 0 ? (
        <p className="muted">No settings saved yet.</p>
      ) : (
        <table>
          <caption className="muted">Current values.</caption>
          <thead>
            <tr>
              <th scope="col">Key</th>
              <th scope="col">Value</th>
            </tr>
          </thead>
          <tbody>
            {settings.map((setting) => (
              <tr key={setting.key}>
                <td>
                  <code>{setting.key}</code>
                </td>
                <td>{setting.key === "ai" ? "configured" : setting.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
