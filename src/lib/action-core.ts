import type { ZodType } from "zod";

export class ActionError extends Error {}

export type ActionResult<T> =
  | { ok: true; data: T; toast?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export const GENERIC_ERROR = "Something went wrong. Please try again.";
export const SIGNED_OUT = "Please sign in again.";

export function fieldErrorsFrom(issues: { path: PropertyKey[]; message: string }[]): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "_");
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return fieldErrors;
}

/** Next.js signals redirect() and notFound() by throwing; those must not be swallowed. */
export function isNextControlFlow(error: unknown): boolean {
  const digest = (error as { digest?: unknown } | null)?.digest;
  return typeof digest === "string" && (digest.startsWith("NEXT_REDIRECT") || digest.startsWith("NEXT_NOT_FOUND"));
}

export type ActionDeps = {
  getSession: () => Promise<unknown | null>;
  logError: (scope: string, error: unknown) => void;
};

export function action<TIn, TOut>(
  schema: ZodType<TIn>,
  handler: (input: TIn, ctx: { toast: (message: string) => void }) => Promise<TOut>,
  deps: ActionDeps,
): (raw: unknown) => Promise<ActionResult<TOut>> {
  return async (raw: unknown): Promise<ActionResult<TOut>> => {
    if (!(await deps.getSession())) return { ok: false, error: SIGNED_OUT };

    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      return {
        ok: false,
        error: "Please fix the highlighted fields.",
        fieldErrors: fieldErrorsFrom(parsed.error.issues),
      };
    }

    let toastMessage: string | undefined;
    try {
      const data = await handler(parsed.data, {
        toast: (message: string) => {
          toastMessage = message;
        },
      });
      return toastMessage ? { ok: true, data, toast: toastMessage } : { ok: true, data };
    } catch (error) {
      if (error instanceof ActionError) return { ok: false, error: error.message };
      if (isNextControlFlow(error)) throw error;
      deps.logError("action", error);
      return { ok: false, error: GENERIC_ERROR };
    }
  };
}
