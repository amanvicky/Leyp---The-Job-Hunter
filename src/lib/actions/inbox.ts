"use server";

import { z } from "zod";
import { serverAction } from "@/lib/action";
import { prisma } from "@/lib/prisma";
import { getEnv } from "@/env";
import { syncInbox } from "@/lib/google/inbox-sync";
import { loadGoogleAccount } from "@/lib/google/oauth";
import { draftReply } from "@/lib/ai/tasks/draft-reply";
import { loadProviderFromSettings } from "@/lib/ai/config-store";
import { buildProfileSummary } from "@/lib/profile/summary";

const GOOGLE_SETTING = "google";

export type GoogleCredentials = { clientId: string; clientSecret: string };

async function loadCredentials(): Promise<GoogleCredentials | null> {
  const { getSetting } = await import("@/lib/settings");
  const raw = await getSetting(GOOGLE_SETTING);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<GoogleCredentials>;
    if (!parsed.clientId || !parsed.clientSecret) return null;
    return { clientId: parsed.clientId, clientSecret: parsed.clientSecret };
  } catch {
    return null;
  }
}

export const saveGoogleCredentialsAction = serverAction(
  z.object({
    clientId: z.string().trim().max(300).optional(),
    clientSecret: z.string().trim().max(300).optional(),
  }),
  async (input) => {
    const { setSetting } = await import("@/lib/settings");
    const existing = await loadCredentials();
    await setSetting(
      GOOGLE_SETTING,
      JSON.stringify({
        clientId: input.clientId || existing?.clientId || "",
        clientSecret: input.clientSecret || existing?.clientSecret || "",
      }),
    );
    const now = await loadCredentials();
    // Presence only. The browser must never hold these.
    return { hasClientId: Boolean(now?.clientId), hasClientSecret: Boolean(now?.clientSecret) };
  },
);

export const googleStatusAction = serverAction(z.object({}), async () => {
  const env = getEnv();
  const credentials = await loadCredentials();
  const account = await loadGoogleAccount(env.APP_SECRET);
  const lastSync = await prisma.googleAccount.findUnique({ where: { id: "google" } });
  return {
    configured: Boolean(credentials),
    connected: Boolean(account),
    email: account?.email ?? "",
    lastSyncAt: lastSync?.lastSyncAt ?? null,
    syncProblem: lastSync?.syncProblem ?? null,
  };
});

export const syncInboxAction = serverAction(z.object({}), async () => {
  const env = getEnv();
  const credentials = await loadCredentials();
  if (!credentials) throw new Error("Add your Google client id and secret in Settings first.");

  const result = await syncInbox(env.APP_SECRET, credentials.clientId, credentials.clientSecret);
  return result;
});

export const listRepliesAction = serverAction(
  z.object({ limit: z.number().int().positive().max(100).default(50) }),
  async (input) => {
    const rows = await prisma.emailMessage.findMany({
      where: { direction: "INCOMING" },
      orderBy: { sentAt: "desc" },
      take: input.limit,
      include: { application: { select: { id: true, title: true, company: true } } },
    });
    return rows.map((row) => ({
      id: row.id,
      subject: row.subject,
      fromName: row.fromName,
      fromAddress: row.fromAddress,
      kind: row.kind,
      summary: row.summary,
      replyDraft: row.replyDraft,
      sentAt: row.sentAt,
      application: row.application,
    }));
  },
);

export const draftReplyAction = serverAction(
  z.object({ emailId: z.string().min(1) }),
  async (input) => {
    const email = await prisma.emailMessage.findUnique({ where: { id: input.emailId } });
    if (!email) throw new Error("That message is no longer here.");

    const provider = await loadProviderFromSettings();
    if (!provider) throw new Error("Configure an AI provider in Settings first.");

    const profileSummary = (await buildProfileSummary()).slice(0, 600);
    const result = await draftReply(provider, {
      emailText: `${email.subject}\n\n${email.body || email.summary}`,
      profileSummary,
    });

    await prisma.emailMessage.update({
      where: { id: email.id },
      data: {
        replyDraft: result.answer,
        replyGaps: JSON.stringify(result.gaps),
        draftedWith: "draft-reply@1",
      },
    });

    return { answer: result.answer, gaps: result.gaps };
  },
);

export const markHandledAction = serverAction(
  z.object({ emailId: z.string().min(1) }),
  async (input) => {
    await prisma.emailMessage.update({ where: { id: input.emailId }, data: { handledAt: new Date() } });
    return { handled: true };
  },
);
