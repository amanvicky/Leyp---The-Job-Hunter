import { prisma } from "@/lib/prisma";
import { serverAction } from "@/lib/action";
import { z } from "zod";
import { applicationInputSchema } from "@/lib/applications/schemas";
import { createApplication } from "@/lib/applications/core";

const createSchema = applicationInputSchema;

export const createApplicationAction = serverAction(createSchema, async (input) => {
  return createApplication(input);
});

const transitionSchema = z.object({
  applicationId: z.string().min(1),
  to: z.enum(["DRAFT", "SENT", "SCREENING", "INTERVIEW", "OFFER", "ACCEPTED", "REJECTED", "DECLINED"]),
  note: z.string().trim().max(2000).optional(),
});

export const transitionApplicationAction = serverAction(transitionSchema, async (input) => {
  const { transitionStatus } = await import("@/lib/applications/core");
  return transitionStatus(input.applicationId, input.to, input.note);
});

const archiveSchema = z.object({ applicationId: z.string().min(1) });

export const archiveApplicationAction = serverAction(archiveSchema, async (input) => {
  const { archiveApplication } = await import("@/lib/applications/core");
  return archiveApplication(input.applicationId);
});

const noteSchema = z.object({
  applicationId: z.string().min(1),
  body: z.string().trim().min(1).max(4000),
});

export const addNoteAction = serverAction(noteSchema, async (input) => {
  const { addNote } = await import("@/lib/applications/core");
  return addNote(input.applicationId, input.body);
});
