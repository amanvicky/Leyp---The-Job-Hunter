import { prisma } from "@/lib/prisma";

export async function upsertDocument(applicationId: string, kind: string, units: unknown) {
  return prisma.document.upsert({
    where: { applicationId_kind: { applicationId, kind } },
    create: { applicationId, kind, units: JSON.stringify(units) },
    update: { units: JSON.stringify(units), updatedAt: new Date() },
  });
}

export async function getDocument(applicationId: string, kind: string) {
  const doc = await prisma.document.findUnique({
    where: { applicationId_kind: { applicationId, kind } },
    include: { versions: { orderBy: { createdAt: "desc" } }, theme: true },
  });
  if (!doc) return null;
  return { ...doc, units: JSON.parse(doc.units) };
}

export async function saveVersion(documentId: string, units: unknown, cause: string, detail = "") {
  return prisma.documentVersion.create({
    data: { documentId, units: JSON.stringify(units), cause, detail },
  });
}

export async function listVersions(documentId: string) {
  const versions = await prisma.documentVersion.findMany({
    where: { documentId },
    orderBy: { createdAt: "desc" },
  });
  return versions.map((version) => ({ ...version, units: JSON.parse(version.units) }));
}

export async function restoreVersion(documentId: string, versionId: string) {
  const version = await prisma.documentVersion.findUnique({ where: { id: versionId } });
  if (!version || version.documentId !== documentId) throw new Error("Version not found.");
  await prisma.document.update({
    where: { id: documentId },
    data: { units: version.units },
  });
  await prisma.documentVersion.create({
    data: { documentId, units: version.units, cause: "RESTORED", detail: `Restored from ${versionId}` },
  });
  return version;
}

export async function setDocumentTheme(documentId: string, themeId: string | null) {
  return prisma.document.update({ where: { id: documentId }, data: { themeId } });
}

export async function setDocumentWrittenWith(documentId: string, writtenWith: string | null) {
  return prisma.document.update({ where: { id: documentId }, data: { writtenWith } });
}

export async function listThemes() {
  return prisma.theme.findMany({ orderBy: [{ builtIn: "desc" }, { name: "asc" }] });
}

export async function getTheme(id: string) {
  return prisma.theme.findUnique({ where: { id } });
}
