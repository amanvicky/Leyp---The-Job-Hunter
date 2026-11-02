import type { ZodType } from "zod";
import { action, type ActionResult, type ActionError } from "./action-core";
import { getSession } from "./auth/session";
import { logServerError } from "./log";

export { ActionError } from "./action-core";
export type { ActionResult } from "./action-core";

/**
 * Wrap a Server Action.
 *
 * Guarantees, for every mutation without exception:
 *  1. the session is checked first;
 *  2. input is validated by `schema`, and failures come back as field errors;
 *  3. unexpected errors are logged without their payload and reported generically;
 *  4. redirect() and notFound() still work.
 */
export function serverAction<TIn, TOut>(
  schema: ZodType<TIn>,
  handler: (input: TIn, ctx: { toast: (message: string) => void }) => Promise<TOut>,
): (raw: unknown) => Promise<ActionResult<TOut>> {
  return action(schema, handler, { getSession, logError: logServerError });
}
