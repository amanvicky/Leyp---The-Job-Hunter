import { NextResponse, type NextRequest } from "next/server";
import { readFileSync } from "node:fs";

/**
 * A CSP nonce. It must be stable for the lifetime of a server process: a
 * per-request nonce would be regenerated on every navigation and the scripts
 * tagged with the previous nonce would be blocked by the new policy. Deriving
 * it from the build id keeps one value for the whole deployment.
 */
const NONCE = Buffer.from(
  (() => {
    try {
      return readFileSync(process.cwd() + "/.next/BUILD_ID", "utf8").trim();
    } catch {
      return crypto.randomUUID();
    }
  })(),
).toString("base64");

/**
 * Security headers on every HTML response. Scripts run only with the nonce,
 * nothing loads from another host, and no other site may frame the app.
 */
export function proxy(request: NextRequest): NextResponse {
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${NONCE}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");

  const headers = new Headers(request.headers);
  headers.set("x-nonce", NONCE);

  const response = NextResponse.next({ request: { headers } });
  response.headers.set("content-security-policy", csp);
  response.headers.set("x-content-type-options", "nosniff");
  response.headers.set("x-frame-options", "DENY");
  response.headers.set("referrer-policy", "strict-origin-when-cross-origin");
  response.headers.set("cross-origin-opener-policy", "same-origin");
  response.headers.set("permissions-policy", "camera=(), microphone=(), geolocation=()");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};