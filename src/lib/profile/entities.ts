import { prisma } from "@/lib/prisma";
import { educationSchema, factSchema, languageSchema, publicationSchema, referenceSchema } from "./schemas";

export async function createEducation(input: unknown) {
  const data = educationSchema.parse(input);
  const maxSort = await prisma.education.aggregate({ _max: { sort: true } });
  return prisma.education.create({
    data: {
      degree: data.degree,
      school: data.school,
      startYear: data.startYear ?? null,
      startMonth: data.startMonth ?? null,
      endYear: data.endYear ?? null,
      endMonth: data.endMonth ?? null,
      current: data.current,
      notes: data.notes,
      sort: (maxSort._max.sort ?? 0) + 1,
    },
  });
}

export async function updateEducation(id: string, input: unknown) {
  const data = educationSchema.parse(input);
  await prisma.education.update({
    where: { id },
    data: {
      degree: data.degree,
      school: data.school,
      startYear: data.startYear ?? null,
      startMonth: data.startMonth ?? null,
      endYear: data.endYear ?? null,
      endMonth: data.endMonth ?? null,
      current: data.current,
      notes: data.notes,
    },
  });
}

export async function deleteEducation(id: string): Promise<void> {
  await prisma.education.delete({ where: { id } });
}

export async function listEducations() {
  return prisma.education.findMany({ orderBy: { sort: "asc" } });
}

export async function upsertProfileField(key: string, value: string): Promise<void> {
  await prisma.profileField.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}

export async function getProfileFields(): Promise<Record<string, string>> {
  const rows = await prisma.profileField.findMany();
  const result: Record<string, string> = {};
  for (const row of rows) result[row.key] = row.value;
  return result;
}

export async function createLanguage(input: unknown) {
  const data = languageSchema.parse(input);
  const maxSort = await prisma.language.aggregate({ _max: { sort: true } });
  return prisma.language.create({
    data: { name: data.name, level: data.level, sort: (maxSort._max.sort ?? 0) + 1 },
  });
}

export async function deleteLanguage(id: string): Promise<void> {
  await prisma.language.delete({ where: { id } });
}

export async function listLanguages() {
  return prisma.language.findMany({ orderBy: { sort: "asc" } });
}

export async function createFact(input: unknown) {
  const data = factSchema.parse(input);
  const maxSort = await prisma.fact.aggregate({ _max: { sort: true }, where: { applicationId: data.applicationId ?? null } });
  return prisma.fact.create({
    data: { text: data.text, applicationId: data.applicationId ?? null, sort: (maxSort._max.sort ?? 0) + 1 },
  });
}

export async function deleteFact(id: string): Promise<void> {
  await prisma.fact.delete({ where: { id } });
}

export async function listFacts(applicationId?: string | null) {
  return prisma.fact.findMany({
    where: { applicationId: applicationId ?? null },
    orderBy: { sort: "asc" },
  });
}

export async function createPublication(input: unknown) {
  const data = publicationSchema.parse(input);
  const maxSort = await prisma.publication.aggregate({ _max: { sort: true } });
  return prisma.publication.create({
    data: { citation: data.citation, link: data.link, onResumes: data.onResumes, sort: (maxSort._max.sort ?? 0) + 1 },
  });
}

export async function deletePublication(id: string): Promise<void> {
  await prisma.publication.delete({ where: { id } });
}

export async function listPublications() {
  return prisma.publication.findMany({ orderBy: { sort: "asc" } });
}

export async function createReference(input: unknown) {
  const data = referenceSchema.parse(input);
  const maxSort = await prisma.reference.aggregate({ _max: { sort: true } });
  return prisma.reference.create({
    data: {
      name: data.name,
      relation: data.relation,
      company: data.company,
      email: data.email,
      phone: data.phone,
      sort: (maxSort._max.sort ?? 0) + 1,
    },
  });
}

export async function deleteReference(id: string): Promise<void> {
  await prisma.reference.delete({ where: { id } });
}

export async function listReferences() {
  return prisma.reference.findMany({ orderBy: { sort: "asc" } });
}
