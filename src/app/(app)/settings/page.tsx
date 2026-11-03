import { verifySession } from "@/lib/auth/session";
import { AiSettingsForm } from "@/components/ai-settings-form";

export const metadata = { title: "Settings · Leyp" };

export default async function SettingsPage() {
  await verifySession();
  return (
    <div className="page">
      <h1>Settings</h1>
      <p className="muted">Everything stays on this machine.</p>
      <AiSettingsForm />
    </div>
  );
}
