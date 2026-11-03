import { loadGoogleAccount, refreshAccessToken } from "@/lib/google/oauth";
import { getEnv } from "@/env";

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1";

export async function sendEmail(
  to: string,
  subject: string,
  body: string,
  secret: string,
  clientId: string,
  clientSecret: string,
  gmailBase = GMAIL_API,
): Promise<{ messageId: string; threadId: string }> {
  const account = await loadGoogleAccount(secret);
  if (!account) throw new Error("No Google account connected.");

  const { accessToken } = await refreshAccessToken(account.refreshToken, clientId, clientSecret);

  const raw = toBase64Url(`To: ${to}\r\nSubject: ${subject}\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${body}`);

  const res = await fetch(`${gmailBase}/users/me/messages/send`, {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
    body: JSON.stringify({ raw }),
  });
  if (!res.ok) throw new Error(`Gmail send failed: ${res.status}`);
  const json = (await res.json()) as { id: string; threadId: string };
  return { messageId: json.id, threadId: json.threadId };
}

function toBase64Url(text: string): string {
  return Buffer.from(text, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}