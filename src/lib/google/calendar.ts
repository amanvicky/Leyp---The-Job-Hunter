import { loadGoogleAccount, refreshAccessToken } from "@/lib/google/oauth";

const CAL_API = "https://www.googleapis.com/calendar/v3";

export async function getFreeBusy(
  timeMin: string,
  timeMax: string,
  secret: string,
  clientId: string,
  clientSecret: string,
  calBase = CAL_API,
): Promise<{ busy: { start: string; end: string }[] }> {
  const account = await loadGoogleAccount(secret);
  if (!account) throw new Error("No Google account connected.");

  const { accessToken } = await refreshAccessToken(account.refreshToken, clientId, clientSecret);

  const res = await fetch(`${calBase}/freeBusy`, {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
    body: JSON.stringify({
      timeMin,
      timeMax,
      items: [{ id: "primary" }],
    }),
  });
  if (!res.ok) throw new Error(`Calendar freeBusy failed: ${res.status}`);
  const json = (await res.json()) as { calendars?: { primary?: { busy?: { start: string; end: string }[] } } };
  return { busy: json.calendars?.primary?.busy ?? [] };
}

export async function createInterviewEvent(
  summary: string,
  start: string,
  end: string,
  secret: string,
  clientId: string,
  clientSecret: string,
  calBase = CAL_API,
): Promise<{ id: string; htmlLink: string }> {
  const account = await loadGoogleAccount(secret);
  if (!account) throw new Error("No Google account connected.");

  const { accessToken } = await refreshAccessToken(account.refreshToken, clientId, clientSecret);

  const res = await fetch(`${calBase}/calendars/primary/events`, {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
    body: JSON.stringify({
      summary,
      start: { dateTime: start },
      end: { dateTime: end },
    }),
  });
  if (!res.ok) throw new Error(`Calendar event create failed: ${res.status}`);
  const json = (await res.json()) as { id: string; htmlLink: string };
  return { id: json.id, htmlLink: json.htmlLink };
}