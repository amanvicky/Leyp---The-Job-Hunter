import { z } from "zod";

export const applicationInputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  company: z.string().trim().min(1).max(200),
  role: z.string().trim().max(200).default(""),
  location: z.string().trim().max(200).default(""),
  mode: z.string().trim().max(80).default(""),
  salary: z.string().trim().max(120).default(""),
  currency: z.string().trim().max(8).default("INR"),
  deadline: z.string().datetime().nullable().optional(),
  postingUrl: z.string().trim().max(2000).default(""),
  postingText: z.string().max(50000).default(""),
  tone: z.enum(["WARM", "FORMAL", "DIRECT", "ENTHUSIASTIC"]).default("WARM"),
  language: z.string().trim().max(40).default(""),
});

export const statusTransitionSchema = z.object({
  applicationId: z.string().min(1),
  to: z.enum(["DRAFT", "SENT", "SCREENING", "INTERVIEW", "OFFER", "ACCEPTED", "REJECTED", "DECLINED"]),
  note: z.string().trim().max(2000).optional(),
});

export const archiveSchema = z.object({
  applicationId: z.string().min(1),
});

export const createFromPostingSchema = z.object({
  postingId: z.string().min(1),
  tone: z.enum(["WARM", "FORMAL", "DIRECT", "ENTHUSIASTIC"]).default("WARM"),
});

export const noteSchema = z.object({
  applicationId: z.string().min(1),
  body: z.string().trim().min(1).max(4000),
});

export const chatMessageSchema = z.object({
  applicationId: z.string().min(1),
  text: z.string().trim().min(1).max(8000),
  targetUnit: z.string().max(80).optional(),
});
