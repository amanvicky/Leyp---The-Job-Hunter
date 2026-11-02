import { json, wrapRoute } from "./route-core";
import { getSession } from "./auth/session";
import { logServerError } from "./log";

export { json } from "./route-core";

/**
 * Wrap a route handler (PDFs, exports, streams, uploads).
 * A cross-origin request gets 403, a signed-out one gets 401.
 */
export function route<C = unknown>(
  handler: (request: Request, context: C) => Promise<Response>,
): (request: Request, context: C) => Promise<Response> {
  return wrapRoute(handler, { getSession, logError: logServerError });
}
