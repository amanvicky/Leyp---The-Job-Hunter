import { z } from "zod";

export const googleAccountSchema = z.object({
  email: z.string().email(),
  refreshTokenEnc: z.string().min(1),
  scopes: z.string().default(""),
  historyId: z.string().optional(),
});

export const emailMessageSchema = z.object({
  gmailId: z.string().min(1),
  threadId: z.string().min(1),
  applicationId: z.string().nullable().optional(),
  direction: z.enum(["OUTGOING", "INCOMING"]),
  fromName: z.string().default(""),
  fromAddress: z.string().default(""),
  toAddress: z.string().default(""),
  subject: z.string().default(""),
  messageId: z.string().default(""),
  body: z.string().default(""),
  sentAt: z.string().datetime(),
  kind: z.enum(["REJECTION", "INTERVIEW", "QUESTION", "OFFER", "ACKNOWLEDGEMENT", "OTHER"]).nullable().optional(),
  summary: z.string().default(""),
  questions: z.array(z.string()).nullable().optional(),
  suggestedStatus: z.string().nullable().optional(),
  classifiedWith: z.string().nullable().optional(),
  replyDraft: z.string().default(""),
  replyGaps: z.array(z.string()).nullable().optional(),
  draftedWith: z.string().nullable().optional(),
  handledAt: z.string().datetime().nullable().optional(),
  dismissedAt: z.string().datetime().nullable().optional(),
});
