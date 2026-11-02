import { GENERIC_ERROR, SIGNED_OUT } from "./action-core";

export type RouteDeps = {
  getSession: () => Promise<unknown | null>;
  logError: (scope: string, error: unknown) => void;
};

export function sameOrigin(origin: string, url: string): boolean {
  try {
    return new URL(origin).host === new URL(url).host;
  } catch {
    return false;
  }
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/**
 * Wrap a route handler.
 *
 * Cross-origin requests are refused, the session is checked, unexpected errors
 * are hidden from the client, and responses are uncached unless the handler
 * sets its own policy.
 */
export function wrapRoute<C = unknown>(
  handler: (request: Request, context: C) => Promise<Response>,
  deps: RouteDeps,
): (request: Request, context: C) => Promise<Response> {
  return async (request: Request, context: C): Promise<Response> => {
    const origin = request.headers.get("origin");
    if (origin && !sameOrigin(origin, request.url)) {
      return json({ error: "Cross-origin request refused." }, 403);
    }
    if (!(await deps.getSession())) {
      return json({ error: SIGNED_OUT }, 401);
    }
    try {
      const response = await handler(request, context);
      if (!response.headers.has("cache-control")) {
        response.headers.set("cache-control", "private, no-store");
      }
      return response;
    } catch (error) {
      if (isNextControlFlow(error)) throw error;
      deps.logError("route", error);
      return json({ error: GENERIC_ERROR }, 500);
    }
  };
}

function isNextControlFlow(error: unknown): boolean {
  const digest = (error as { digest?: unknown } | null)?.digest;
  return typeof digest === "string" && (digest.startsWith("NEXT_REDIRECT") || digest.startsWith("NEXT_NOT_FOUND"));
}
