"use client";

import { useState } from "react";
import { signIn } from "./actions";

export function SignInForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData): Promise<void> {
    setPending(true);
    setError(null);
    try {
      const result = await signIn({
        password: String(formData.get("password") ?? ""),
        remember: formData.get("remember") === "on",
      });
      if (result && !result.ok) setError(result.error ?? "Could not sign in.");
    } catch (caught) {
      // redirect() from the action arrives here as a thrown signal; anything
      // else is a real failure worth showing.
      const digest = (caught as { digest?: string })?.digest;
      if (!digest?.startsWith("NEXT_REDIRECT")) {
        setError("Could not sign in. Please try again.");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <form action={onSubmit} className="stack">
      <div className="field">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          autoFocus
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "signin-error" : undefined}
        />
      </div>

      <div className="field-inline">
        <input id="remember" name="remember" type="checkbox" />
        <label htmlFor="remember">Keep me signed in for 30 days</label>
      </div>

      {error ? (
        <p id="signin-error" role="alert" className="error">
          {error}
        </p>
      ) : null}

      <button type="submit" disabled={pending} className="button">
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
