import { prisma } from "@/lib/prisma";
import { experienceSchema } from "./schemas";

export async function createExperience(input: unknown) {
  const data = experienceSchema.parse(input);
  const maxSort = await prisma.experience.aggregate({ _max: { sort: true } });
  const experience = await prisma.experience.create({
    data: {
      role: data.role,
      company: data.company,
      location: data.location,
      descriptor: data.descriptor,
      startYear: data.startYear ?? null,
      startMonth: data.startMonth ?? null,
      endYear: data.endYear ?? null,
      endMonth: data.endMonth ?? null,
      current: data.current,
      bullets: data.bullets,
      sort: (maxSort._max.sort ?? 0) + 1,
    },
  });
  for (const skillId of data.skillIds) {
    await prisma.experienceSkill.create({ data: { experienceId: experience.id, skillId } });
  }
  return experience;
}

export async function updateExperience(id: string, input: unknown) {
  const data = experienceSchema.parse(input);
  await prisma.experience.update({
    where: { id },
    data: {
      role: data.role,
      company: data.company,
      location: data.location,
      descriptor: data.descriptor,
      startYear: data.startYear ?? null,
      startMonth: data.startMonth ?? null,
      endYear: data.endYear ?? null,
      endMonth: data.endMonth ?? null,
      current: data.current,
      bullets: data.bullets,
    },
  });
  await prisma.experienceSkill.deleteMany({ where: { experienceId: id } });
  for (const skillId of data.skillIds) {
    await prisma.experienceSkill.create({ data: { experienceId: id, skillId } });
  }
}

export async function deleteExperience(id: string): Promise<void> {
  await prisma.experience.delete({ where: { id } });
}

export async function reorderExperiences(ids: string[]): Promise<void> {
  await prisma.$transaction(
    ids.map((id, index) => prisma.experience.update({ where: { id }, data: { sort: index } })),
  );
}

export async function listExperiences() {
  return prisma.experience.findMany({
    include: { skills: { include: { skill: true } } },
    orderBy: { sort: "asc" },
  });
}
