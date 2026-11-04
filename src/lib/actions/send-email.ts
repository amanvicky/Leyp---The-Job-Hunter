"use server";

import { z } from "zod";
import { serverAction } from "@/lib/action";
import { getEnv } from "@/env";
import { loadGoogleAccount } from "@/lib/google/oauth";
import { sendEmail } from "@/lib/google/gmail";
import { getSetting } from "@/lib/settings";
import { prisma } from "@/lib/prisma";

const GOOGLE_SETTING = "google";

async function loadCredentials(): Promise<{ clientId: string; clientSecret: string } | null> {
  const raw = await getSetting(GOOGLE_SETTING);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { clientId?: string; clientSecret?: string };
    if (!parsed.clientId || !parsed.clientSecret) return null;
    return { clientId: parsed.clientId, clientSecret: parsed.clientSecret };
  } catch {
    return null;
  }
}

const sendSchema = z.object({
  applicationId: z.string().min(1),
  to: z.string().email(),
  subject: z.string().trim().min(1).max(300),
  body: z.string().trim().min(1).max(20000),
  confirmed: z.literal(true),
});

export const sendApplicationEmailAction = serverAction(sendSchema, async (input) => {
  const env = getEnv();
  const credentials = await loadCredentials();
  if (!credentials) throw new Error("Add your Google client id and secret in Settings first.");

  const account = await loadGoogleAccount(env.APP_SECRET);
  if (!account) throw new Error("Connect a Google account first.");

  const result = await sendEmail(input.to, input.subject, input.body, env.APP_SECRET, credentials.clientId, credentials.clientSecret);

  await prisma.emailMessage.create({
    data: {
      gmailId: result.messageId,
      threadId: result.threadId,
      applicationId: input.applicationId,
      direction: "OUTGOING",
      fromName: account.email,
      fromAddress: account.email,
      toAddress: input.to,
      subject: input.subject,
      body: input.body,
      sentAt: new Date(),
      messageId: result.messageId,
    },
  });

  return { messageId: result.messageId, threadId: result.threadId };
});