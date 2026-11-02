export const GENERIC_ERROR = "Something went wrong. Please try again.";

/**
 * Unexpected errors are logged with their name and message only.
 * The payload is never logged: it carries postings and personal data.
 */
export function logServerError(scope: string, error: unknown): void {
  const name = error instanceof Error ? error.name : "Unknown";
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[${scope}] ${name}: ${message}`);
}
