import { prisma } from "@/lib/prisma";

export async function createApplication(input: {
  title: string;
  company: string;
  role?: string;
  location?: string;
  mode?: string;
  salary?: string;
  currency?: string;
  deadline?: string | null;
  postingUrl?: string;
  postingText?: string;
  tone?: string;
  language?: string;
}) {
  return prisma.application.create({
    data: {
      title: input.title,
      company: input.company,
      role: input.role ?? "",
      location: input.location ?? "",
      mode: input.mode ?? "",
      salary: input.salary ?? "",
      currency: input.currency ?? "INR",
      deadline: input.deadline ? new Date(input.deadline) : null,
      postingUrl: input.postingUrl ?? "",
      postingText: input.postingText ?? "",
      tone: input.tone ?? "WARM",
      language: input.language ?? "",
      origin: "MANUAL",
      status: "DRAFT",
    },
  });
}

export async function createFromPosting(postingId: string, tone: string) {
  const posting = await prisma.posting.findUnique({ where: { id: postingId } });
  if (!posting) throw new Error("Posting not found.");
  return prisma.application.create({
    data: {
      title: posting.title,
      company: posting.company,
      location: posting.place,
      salary: posting.salary,
      salaryMin: posting.salaryMin,
      salaryMax: posting.salaryMax,
      currency: posting.currency,
      postingUrl: posting.url,
      postingText: posting.description,
      postingId: posting.id,
      tone,
      origin: "MANUAL",
      status: "DRAFT",
    },
  });
}

export async function getApplication(id: string) {
  return prisma.application.findUnique({
    where: { id },
    include: {
      documents: true,
      emails: { orderBy: { sentAt: "desc" } },
      events: { orderBy: { at: "desc" } },
      notes: { orderBy: { createdAt: "desc" } },
      messages: { orderBy: { createdAt: "asc" } },
      facts: { orderBy: { sort: "asc" } },
    },
  });
}

export async function listApplications(options: { status?: string; archived?: boolean } = {}) {
  return prisma.application.findMany({
    where: {
      awaitingReview: false,
      archivedAt: options.archived ? { not: null } : null,
      ...(options.status ? { status: options.status } : {}),
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function updateApplication(id: string, patch: Partial<{
  title: string;
  company: string;
  role: string;
  location: string;
  mode: string;
  salary: string;
  currency: string;
  deadline: string | null;
  postingUrl: string;
  postingText: string;
  tone: string;
  language: string;
  extracted: string;
  extractedWith: string;
  match: string;
  matchedWith: string;
}>) {
  return prisma.application.update({
    where: { id },
    data: {
      ...patch,
      ...(patch.deadline !== undefined ? { deadline: patch.deadline ? new Date(patch.deadline) : null } : {}),
    },
  });
}

export async function transitionStatus(applicationId: string, to: string, note?: string) {
  const application = await prisma.application.findUnique({ where: { id: applicationId } });
  if (!application) throw new Error("Application not found.");
  if (application.status === to) return application;

  // Furthest stage is monotonic: it only moves forward, never back.
  const furthestOrder = ["SENT", "SCREENING", "INTERVIEW", "OFFER", "ACCEPTED"];
  const previousFurthest = application.furthestStage;
  let nextFurthest = application.furthestStage;
  if (furthestOrder.indexOf(to) > furthestOrder.indexOf(application.furthestStage ?? "")) {
    nextFurthest = to;
  }

  const sentAt = application.sentAt ?? (to === "SENT" ? new Date() : null);

  const updated = await prisma.application.update({
    where: { id: applicationId },
    data: {
      status: to,
      furthestStage: nextFurthest,
      sentAt: application.sentAt ?? sentAt,
    },
  });

  await prisma.statusEvent.create({
    data: {
      applicationId,
      from: application.status,
      to,
      previousFurthestStage: previousFurthest,
      previousSentAt: application.sentAt,
    },
  });

  if (note) {
    await prisma.note.create({ data: { applicationId, body: note } });
  }

  return updated;
}

export async function archiveApplication(id: string) {
  return prisma.application.update({ where: { id }, data: { archivedAt: new Date() } });
}

export async function unarchiveApplication(id: string) {
  return prisma.application.update({ where: { id }, data: { archivedAt: null } });
}

export async function addNote(applicationId: string, body: string) {
  return prisma.note.create({ data: { applicationId, body } });
}

export async function listNotes(applicationId: string) {
  return prisma.note.findMany({ where: { applicationId }, orderBy: { createdAt: "desc" } });
}
