export class AiError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "AiError";
  }
}

/** A failure a person can act on, rather than a raw provider body. */
export function messageFor(status: number, provider: string): string {
  if (status === 401 || status === 403) return `Your ${provider} key was rejected. Check it in Settings.`;
  if (status === 429 || status === 529) return `${provider} is rate-limiting requests. Wait a minute and try again.`;
  if (status === 404) return `${provider} does not have that model. Check the model name in Settings.`;
  if (status >= 500) return `${provider} is having trouble. Try again shortly.`;
  return `${provider} refused the request.`;
}
