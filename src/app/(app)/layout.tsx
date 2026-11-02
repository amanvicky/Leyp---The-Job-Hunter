import { verifySession } from "@/lib/auth/session";
import { Sidebar } from "./sidebar";
import "./shell.css";

/**
 * Every page beneath this layout is gated: verifySession() runs before any
 * child renders, so a new page cannot be reached while signed out.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await verifySession();
  return (
    <div className="shell">
      <Sidebar />
      <main className="main">{children}</main>
    </div>
  );
}
