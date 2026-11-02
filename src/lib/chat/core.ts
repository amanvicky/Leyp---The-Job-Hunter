import { prisma } from "@/lib/prisma";

export async function addChatMessage(input: {
  applicationId: string;
  role: "USER" | "AI";
  text: string;
  targetUnit?: string | null;
  edits?: unknown;
  undone?: boolean;
  previousTone?: string | null;
  writtenWith?: string | null;
}) {
  return prisma.chatMessage.create({
    data: {
      applicationId: input.applicationId,
      role: input.role,
      text: input.text,
      targetUnit: input.targetUnit ?? null,
      edits: input.edits ? JSON.stringify(input.edits) : null,
      undone: input.undone ?? false,
      previousTone: input.previousTone ?? null,
      writtenWith: input.writtenWith ?? null,
    },
  });
}

export async function listChatMessages(applicationId: string) {
  const messages = await prisma.chatMessage.findMany({
    where: { applicationId },
    orderBy: { createdAt: "asc" },
  });
  return messages.map((message) => ({
    ...message,
    edits: message.edits ? JSON.parse(message.edits) : null,
  }));
}

export async function markChatMessageUndone(id: string) {
  return prisma.chatMessage.update({ where: { id }, data: { undone: true } });
}

export async function countChatMessages(applicationId: string) {
  return prisma.chatMessage.count({ where: { applicationId } });
}
