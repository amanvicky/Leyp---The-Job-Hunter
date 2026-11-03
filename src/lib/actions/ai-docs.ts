"use server";

import { serverAction } from "@/lib/action";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { loadProviderFromSettings } from "@/lib/ai/config-store";
import { matchRequirements } from "@/lib/ai/tasks/match-requirements";
import { tailorResume } from "@/lib/ai/tasks/tailor-resume";
import { writeCoverLetter } from "@/lib/ai/tasks/write-cover-letter";
import { refineChat } from "@/lib/ai/tasks/refine-chat";
import { buildProfileSummary } from "@/lib/profile/summary";
import { getApplication } from "@/lib/applications/core";
import { upsertDocument, saveVersion } from "@/lib/documents/core";


const idSchema = z.object({ applicationId: z.string().min(1) });

export const runMatchAction = serverAction(idSchema, async (input) => {
  const provider = await loadProviderFromSettings();
  if (!provider) throw new Error("Configure an AI provider in Settings first.");

  const application = await getApplication(input.applicationId);
  if (!application) throw new Error("Application not found.");

  let requirements: string[] = [];
  try {
    const extracted = application.extracted ? JSON.parse(application.extracted) : null;
    if (extracted?.requirements) requirements = extracted.requirements;
  } catch {
    // ignore
  }
  if (requirements.length === 0) {
    // fall back to the offline extractor's requirements by re-running it
    const { extractPostingOffline } = await import("@/lib/applications/extract-offline");
    requirements = extractPostingOffline(application.postingText).requirements;
  }

  const profileSummary = (await buildProfileSummary()).slice(0, 600);
  let result;
  try {
    result = await matchRequirements(provider, { postingText: application.postingText, requirements, profileSummary });
  } catch {
    result = await matchRequirements(provider, { postingText: application.postingText, requirements, profileSummary });
  }

  const matchJson = JSON.stringify(result);
  await prisma.application.update({
    where: { id: input.applicationId },
    data: { match: matchJson, matchedWith: "match-requirements@1" },
  });

  return { score: result.score, report: result.report };
});

const toneSchema = z.object({
  applicationId: z.string().min(1),
  tone: z.enum(["WARM", "FORMAL", "DIRECT", "ENTHUSIASTIC"]).default("WARM"),
});

export const runTailorResumeAction = serverAction(toneSchema, async (input) => {
  const provider = await loadProviderFromSettings();
  if (!provider) throw new Error("Configure an AI provider in Settings first.");

  const application = await getApplication(input.applicationId);
  if (!application) throw new Error("Application not found.");

  const profileSummary = (await buildProfileSummary()).slice(0, 600);
  let result;
  try {
    result = await tailorResume(provider, { postingText: application.postingText, profileSummary, tone: input.tone });
  } catch {
    result = await tailorResume(provider, { postingText: application.postingText, profileSummary, tone: input.tone });
  }

  const doc = await upsertDocument(input.applicationId, "RESUME", result.units);
  await saveVersion(doc.id, result.units, "WRITTEN", "tailor-resume@1");
  await prisma.document.update({ where: { id: doc.id }, data: { writtenWith: "tailor-resume@1" } });

  return { units: result.units, documentId: doc.id };
});

export const runCoverLetterAction = serverAction(toneSchema, async (input) => {
  const provider = await loadProviderFromSettings();
  if (!provider) throw new Error("Configure an AI provider in Settings first.");

  const application = await getApplication(input.applicationId);
  if (!application) throw new Error("Application not found.");

  const profileSummary = (await buildProfileSummary()).slice(0, 600);
  let result;
  try {
    result = await writeCoverLetter(provider, { postingText: application.postingText, profileSummary, tone: input.tone });
  } catch {
    result = await writeCoverLetter(provider, { postingText: application.postingText, profileSummary, tone: input.tone });
  }

  const doc = await upsertDocument(input.applicationId, "COVER_LETTER", result.units);
  await saveVersion(doc.id, result.units, "WRITTEN", "write-cover-letter@1");
  await prisma.document.update({ where: { id: doc.id }, data: { writtenWith: "write-cover-letter@1" } });

  return { units: result.units, documentId: doc.id };
});




const refineSchema = z.object({
  applicationId: z.string().min(1),
  kind: z.enum(["RESUME", "COVER_LETTER"]),
  message: z.string().trim().min(1).max(8000),
});

export const refineChatAction = serverAction(refineSchema, async (input) => {
  const provider = await loadProviderFromSettings();
  if (!provider) throw new Error("Configure an AI provider in Settings first.");

  const application = await getApplication(input.applicationId);
  if (!application) throw new Error("Application not found.");

  const doc = await (await import("@/lib/documents/core")).getDocument(input.applicationId, input.kind);
  if (!doc) throw new Error("No document to refine. Generate one first.");

  const result = await refineChat(provider, { instruction: input.message, units: doc.units });

  // Apply edits.
  const unitMap = new Map(doc.units.map((u: { id: string; text: string }) => [u.id, u.text]));
  for (const edit of result.edits) {
    if (unitMap.has(edit.unitId)) {
      unitMap.set(edit.unitId, edit.newText);
    }
  }
  const newUnits = doc.units.map((u: { id: string; text: string }) => ({ id: u.id, text: unitMap.get(u.id) ?? u.text }));

  // Save version + chat message.
  const { saveVersion } = await import("@/lib/documents/core");
  await saveVersion(doc.id, newUnits, "REFINED", input.message);
  await upsertDocument(input.applicationId, input.kind, newUnits);

  const { addChatMessage } = await import("@/lib/chat/core");
  await addChatMessage({ applicationId: input.applicationId, role: "USER", text: input.message, targetUnit: null });
  await addChatMessage({ applicationId: input.applicationId, role: "AI", text: result.reply, edits: result.edits });

  return { reply: result.reply, edits: result.edits, units: newUnits };
});



