import { prisma } from "@/lib/prisma";

export async function upsertGoogleAccount(input: {
  email: string;
  refreshTokenEnc: string;
  scopes?: string;
  historyId?: string | null;
}) {
  return prisma.googleAccount.upsert({
    where: { id: "google" },
    create: {
      id: "google",
      email: input.email,
      refreshTokenEnc: input.refreshTokenEnc,
      scopes: input.scopes ?? "",
      historyId: input.historyId ?? null,
    },
    update: {
      email: input.email,
      refreshTokenEnc: input.refreshTokenEnc,
      scopes: input.scopes ?? undefined,
      historyId: input.historyId ?? undefined,
    },
  });
}

export async function getGoogleAccount() {
  return prisma.googleAccount.findUnique({ where: { id: "google" } });
}

export async function deleteGoogleAccount() {
  await prisma.googleAccount.deleteMany({});
}

export async function upsertEmailMessage(input: {
  gmailId: string;
  threadId: string;
  applicationId?: string | null;
  direction: "OUTGOING" | "INCOMING";
  fromName?: string;
  fromAddress?: string;
  toAddress?: string;
  subject?: string;
  messageId?: string;
  body?: string;
  sentAt: string;
  kind?: string | null;
  summary?: string;
  questions?: string[] | null;
  suggestedStatus?: string | null;
  classifiedWith?: string | null;
  replyDraft?: string;
  replyGaps?: string[] | null;
  draftedWith?: string | null;
  handledAt?: string | null;
  dismissedAt?: string | null;
}) {
  return prisma.emailMessage.upsert({
    where: { gmailId: input.gmailId },
    create: {
      gmailId: input.gmailId,
      threadId: input.threadId,
      applicationId: input.applicationId ?? null,
      direction: input.direction,
      fromName: input.fromName ?? "",
      fromAddress: input.fromAddress ?? "",
      toAddress: input.toAddress ?? "",
      subject: input.subject ?? "",
      messageId: input.messageId ?? "",
      body: input.body ?? "",
      sentAt: new Date(input.sentAt),
      kind: input.kind ?? null,
      summary: input.summary ?? "",
      questions: input.questions ? JSON.stringify(input.questions) : null,
      suggestedStatus: input.suggestedStatus ?? null,
      classifiedWith: input.classifiedWith ?? null,
      replyDraft: input.replyDraft ?? "",
      replyGaps: input.replyGaps ? JSON.stringify(input.replyGaps) : null,
      draftedWith: input.draftedWith ?? null,
      handledAt: input.handledAt ? new Date(input.handledAt) : null,
      dismissedAt: input.dismissedAt ? new Date(input.dismissedAt) : null,
    },
    update: {
      threadId: input.threadId,
      applicationId: input.applicationId ?? undefined,
      direction: input.direction,
      fromName: input.fromName ?? undefined,
      fromAddress: input.fromAddress ?? undefined,
      toAddress: input.toAddress ?? undefined,
      subject: input.subject ?? undefined,
      messageId: input.messageId ?? undefined,
      body: input.body ?? undefined,
      sentAt: new Date(input.sentAt),
      kind: input.kind ?? undefined,
      summary: input.summary ?? undefined,
      questions: input.questions ? JSON.stringify(input.questions) : undefined,
      suggestedStatus: input.suggestedStatus ?? undefined,
      classifiedWith: input.classifiedWith ?? undefined,
      replyDraft: input.replyDraft ?? undefined,
      replyGaps: input.replyGaps ? JSON.stringify(input.replyGaps) : undefined,
      draftedWith: input.draftedWith ?? undefined,
      handledAt: input.handledAt ? new Date(input.handledAt) : undefined,
      dismissedAt: input.dismissedAt ? new Date(input.dismissedAt) : undefined,
    },
  });
}

export async function listEmailMessages(options: { applicationId?: string; direction?: string } = {}) {
  return prisma.emailMessage.findMany({
    where: {
      ...(options.applicationId ? { applicationId: options.applicationId } : {}),
      ...(options.direction ? { direction: options.direction } : {}),
    },
    orderBy: { sentAt: "desc" },
  });
}

export async function getEmailMessage(id: string) {
  return prisma.emailMessage.findUnique({ where: { id } });
}

export async function markEmailHandled(id: string) {
  return prisma.emailMessage.update({ where: { id }, data: { handledAt: new Date() } });
}

export async function dismissEmail(id: string) {
  return prisma.emailMessage.update({ where: { id }, data: { dismissedAt: new Date() } });
}

export async function linkEmailToApplication(id: string, applicationId: string) {
  return prisma.emailMessage.update({ where: { id }, data: { applicationId } });
}
