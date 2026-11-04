import { loadGoogleAccount, refreshAccessToken } from "@/lib/google/oauth";
import { classifyReply, CLASSIFY_REPLY_VERSION } from "@/lib/ai/tasks/classify-reply";
import { loadProviderFromSettings } from "@/lib/ai/config-store";
import { prisma } from "@/lib/prisma";

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1";

export type GmailPart = {
  mimeType?: string;
  body?: { data?: string };
  parts?: GmailPart[];
  headers?: { name: string; value: string }[];
};

export type GmailMessage = {
  id: string;
  threadId: string;
  internalDate?: string;
  payload?: GmailPart;
};

/** Splits `Ada Lovelace <ada@example.com>` into its name and address. */
export function parseAddress(raw: string): { name: string; address: string } {
  const angled = /^(.*)<([^>]+)>\s*$/.exec(raw.trim());
  if (angled) {
    const name = (angled[1] ?? "").trim().replace(/^"|"$/g, "");
    return { name, address: (angled[2] ?? "").trim().toLowerCase() };
  }
  const bare = raw.trim().toLowerCase();
  return { name: "", address: bare };
}

/** Header lookup that ignores case, because Gmail does not promise any. */
export function headerValue(part: GmailPart | undefined, name: string): string {
  const found = part?.headers?.find((h) => h.name.toLowerCase() === name.toLowerCase());
  return found?.value ?? "";
}

/** Gmail sends base64url; Node wants base64. */
export function decodeBody(data: string): string {
  const normalised = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalised, "base64").toString("utf8");
}

/** The first text/plain part anywhere in the tree, or "" when there is none. */
export function findPlainText(part: GmailPart | undefined): string {
  if (!part) return "";
  if (part.mimeType === "text/plain" && part.body?.data) return decodeBody(part.body.data);
  for (const child of part.parts ?? []) {
    const text = findPlainText(child);
    if (text) return text;
  }
  return "";
}

/** The first text/plain part, or the stripped text of the first text/html part. */
export function findBody(part: GmailPart | undefined): string {
  if (!part) return "";
  // Plain text anywhere in the tree beats HTML anywhere in the tree, even when
  // the HTML comes first, which multipart/alternative always does.
  const plain = findPlainText(part);
  if (plain) return plain;
  if (part.mimeType === "text/html" && part.body?.data) {
    return decodeBody(part.body.data).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }
  for (const child of part.parts ?? []) {
    const text = findBody(child);
    if (text) return text;
  }
  return "";
}

export type SyncResult = { synced: number; classified: number; linked: number };

/**
 * Pull the newest inbox messages, store them, and classify each new reply.
 *
 * Linking is deliberately conservative: an incoming message is attached to an
 * application only when the sender's domain matches the application's company,
 * so a mis-link never leads to a wrong reply being drafted.
 */
export async function syncInbox(
  secret: string,
  clientId: string,
  clientSecret: string,
  gmailBase = GMAIL_API,
): Promise<SyncResult> {
  const account = await loadGoogleAccount(secret);
  if (!account) throw new Error("No Google account connected.");

  const { accessToken } = await refreshAccessToken(account.refreshToken, clientId, clientSecret);

  const listRes = await fetch(`${gmailBase}/users/me/messages?maxResults=25&labelIds=INBOX`, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!listRes.ok) throw new Error(`Gmail list failed: ${listRes.status}`);
  const listJson = (await listRes.json()) as { messages?: { id: string }[] };
  const listed = listJson.messages ?? [];

  const provider = await loadProviderFromSettings();
  const applications = await prisma.application.findMany({
    select: { id: true, company: true },
  });

  let synced = 0;
  let classified = 0;
  let linked = 0;

  for (const item of listed) {
    const msgRes = await fetch(`${gmailBase}/users/me/messages/${item.id}?format=full`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!msgRes.ok) continue;
    const msg = (await msgRes.json()) as GmailMessage;

    const from = parseAddress(headerValue(msg.payload, "From"));
    const subject = headerValue(msg.payload, "Subject");
    const messageId = headerValue(msg.payload, "Message-ID");
    const body = findBody(msg.payload);
    const sentAt = msg.internalDate ? new Date(Number(msg.internalDate)) : new Date();

    const application = applications.find(
      (a) => a.company && from.address.includes(a.company.toLowerCase().replace(/\s+/g, "")),
    );
    if (application) linked += 1;

    const existing = await prisma.emailMessage.findUnique({ where: { gmailId: msg.id } });
    const row = await prisma.emailMessage.upsert({
      where: { gmailId: msg.id },
      create: {
        gmailId: msg.id,
        threadId: msg.threadId,
        applicationId: application?.id ?? null,
        direction: "INCOMING",
        fromName: from.name,
        fromAddress: from.address,
        subject,
        messageId,
        body,
        sentAt,
        summary: body.slice(0, 200),
      },
      update: {
        threadId: msg.threadId,
        applicationId: application?.id ?? null,
        fromName: from.name,
        fromAddress: from.address,
        subject,
        messageId,
        body,
        sentAt,
      },
    });
    synced += 1;

    // Classify only the first time we see a message, so a resync is cheap.
    if (provider && !existing?.kind && body) {
      try {
        const result = await classifyReply(provider, { emailText: body.slice(0, 4000) });
        await prisma.emailMessage.update({
          where: { id: row.id },
          data: { kind: result.classification.toUpperCase(), classifiedWith: CLASSIFY_REPLY_VERSION },
        });
        classified += 1;
      } catch {
        // A model that will not answer must not stop the sync.
      }
    }
  }

  await prisma.googleAccount.update({
    where: { id: "google" },
    data: { lastSyncAt: new Date(), syncProblem: null },
  });

  return { synced, classified, linked };
}
