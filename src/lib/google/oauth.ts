import { encrypt, decrypt } from "@/lib/secrets";
import { prisma } from "@/lib/prisma";

const SCOPES = ["https://www.googleapis.com/auth/gmail.send", "https://www.googleapis.com/auth/gmail.readonly"];

export function googleAuthUrl(clientId: string, redirectUri: string, state: string, authBase = "https://accounts.google.com"): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `${authBase}/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeCode(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string,
  tokenUrl = "https://oauth2.googleapis.com/token",
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });
  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) throw new Error(`Google token exchange failed: ${res.status}`);
  const json = (await res.json()) as { access_token: string; refresh_token?: string; expires_in: number };
  if (!json.refresh_token) throw new Error("No refresh token returned. Revoke access and retry.");
  return { accessToken: json.access_token, refreshToken: json.refresh_token, expiresIn: json.expires_in };
}

export async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string,
  tokenUrl = "https://oauth2.googleapis.com/token",
): Promise<{ accessToken: string; expiresIn: number }> {
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
  });
  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) throw new Error(`Google token refresh failed: ${res.status}`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  return { accessToken: json.access_token, expiresIn: json.expires_in };
}

export async function saveGoogleAccount(
  email: string,
  refreshToken: string,
  scopes: string[],
  secret: string,
): Promise<void> {
  const enc = encrypt(refreshToken, "GOOGLE_TOKEN", secret);
  await prisma.googleAccount.upsert({
    where: { id: "google" },
    create: { id: "google", email, refreshTokenEnc: enc, scopes: scopes.join(" ") },
    update: { email, refreshTokenEnc: enc, scopes: scopes.join(" ") },
  });
}

export async function loadGoogleAccount(secret: string): Promise<{ email: string; refreshToken: string; scopes: string[] } | null> {
  const row = await prisma.googleAccount.findUnique({ where: { id: "google" } });
  if (!row) return null;
  return { email: row.email, refreshToken: decrypt(row.refreshTokenEnc, "GOOGLE_TOKEN", secret), scopes: row.scopes.split(" ").filter(Boolean) };
}

export async function deleteGoogleAccount(): Promise<void> {
  await prisma.googleAccount.deleteMany({});
}