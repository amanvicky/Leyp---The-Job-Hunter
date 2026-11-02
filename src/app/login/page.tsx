import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getEnv } from "@/env";
import { SignInForm } from "./sign-in-form";

export const metadata = { title: "Sign in · Leyp" };

export default async function LoginPage() {
  // A signed-in visitor has no business here.
  try {
    if (await getSession()) redirect("/");
  } catch (caught) {
    const digest = (caught as { digest?: string })?.digest;
    if (digest?.startsWith("NEXT_REDIRECT")) throw caught;
  }

  // A first run with no configuration should say so plainly rather than
  // failing on a stack trace.
  let configured = true;
  try {
    getEnv();
  } catch {
    configured = false;
  }

  return (
    <main className="centered">
      <div className="card">
        <h1>Leyp</h1>
        <p className="muted">Your job search, on your own machine.</p>
        {configured ? (
          <SignInForm />
        ) : (
          <div role="alert" className="error">
            <p>Leyp is not configured yet.</p>
            <p>
              Copy <code>.env.example</code> to <code>.env</code>, then run{" "}
              <code>npm run hash-password -- &lt;your password&gt;</code> and put the result in{" "}
              <code>APP_PASSWORD</code>.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
