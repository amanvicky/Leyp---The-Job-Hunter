"use server";

import { prisma } from "@/lib/prisma";
import { serverAction } from "@/lib/action";
import { z } from "zod";
import { applicationInputSchema } from "@/lib/applications/schemas";
import { createApplication, getApplication, transitionStatus, archiveApplication, unarchiveApplication, addNote } from "@/lib/applications/core";
import { extractPostingOffline, parseSalaryRange } from "@/lib/applications/extract-offline";

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
  return transitionStatus(input.applicationId, input.to, input.note);
});

const archiveSchema = z.object({ applicationId: z.string().min(1) });

export const archiveApplicationAction = serverAction(archiveSchema, async (input) => {
  return archiveApplication(input.applicationId);
});

const noteSchema = z.object({
  applicationId: z.string().min(1),
  body: z.string().trim().min(1).max(4000),
});

export const addNoteAction = serverAction(noteSchema, async (input) => {
  return addNote(input.applicationId, input.body);
});

const getSchema = z.object({ id: z.string().min(1) });

export const getApplicationAction = serverAction(getSchema, async (input) => {
  const application = await getApplication(input.id);
  if (!application) throw new Error("Application not found.");
  return application;
});

const unarchiveSchema = z.object({ applicationId: z.string().min(1) });

export const unarchiveApplicationAction = serverAction(unarchiveSchema, async (input) => {
  return unarchiveApplication(input.applicationId);
});

const pasteSchema = z.object({
  text: z.string().min(1, "Paste the posting first.").max(100_000),
  postingUrl: z.string().trim().max(2000).default(""),
  tone: z.enum(["WARM", "FORMAL", "DIRECT", "ENTHUSIASTIC"]).default("WARM"),
});

export const createApplicationFromPasteAction = serverAction(pasteSchema, async (input) => {
  const extracted = extractPostingOffline(input.text, input.postingUrl);
  const salary = parseSalaryRange(extracted.salary);

  const posting = await prisma.posting.create({
    data: {
      source: "PASTE",
      externalId: `paste-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: extracted.title,
      company: extracted.company,
      place: extracted.location,
      salary: extracted.salary,
      salaryMin: salary.min,
      salaryMax: salary.max,
      currency: salary.currency,
      url: input.postingUrl,
      description: input.text,
      complete: false,
    },
  });

  const application = await createApplication({
    title: extracted.title || "Untitled role",
    company: extracted.company || "Unknown company",
    location: extracted.location,
    salary: extracted.salary,
    currency: salary.currency,
    postingUrl: input.postingUrl,
    postingText: input.text,
    tone: input.tone,
  });

  await prisma.posting.update({
    data: { application: { connect: { id: application.id } } },
    where: { id: posting.id },
  });

  return {
    applicationId: application.id,
    postingId: posting.id,
    extracted: {
      title: extracted.title,
      company: extracted.company,
      location: extracted.location,
      salary: extracted.salary,
      requirements: extracted.requirements,
      confidence: extracted.confidence,
    },
  };
});
