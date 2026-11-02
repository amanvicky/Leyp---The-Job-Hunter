import { prisma } from "@/lib/prisma";
import { projectSchema } from "./schemas";

export async function createProject(input: unknown) {
  const data = projectSchema.parse(input);
  const maxSort = await prisma.project.aggregate({ _max: { sort: true } });
  const project = await prisma.project.create({
    data: {
      name: data.name,
      link: data.link,
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
    await prisma.projectSkill.create({ data: { projectId: project.id, skillId } });
  }
  return project;
}

export async function updateProject(id: string, input: unknown) {
  const data = projectSchema.parse(input);
  await prisma.project.update({
    where: { id },
    data: {
      name: data.name,
      link: data.link,
      startYear: data.startYear ?? null,
      startMonth: data.startMonth ?? null,
      endYear: data.endYear ?? null,
      endMonth: data.endMonth ?? null,
      current: data.current,
      bullets: data.bullets,
    },
  });
  await prisma.projectSkill.deleteMany({ where: { projectId: id } });
  for (const skillId of data.skillIds) {
    await prisma.projectSkill.create({ data: { projectId: id, skillId } });
  }
}

export async function deleteProject(id: string): Promise<void> {
  await prisma.project.delete({ where: { id } });
}

export async function listProjects() {
  return prisma.project.findMany({
    include: { skills: { include: { skill: true } } },
    orderBy: { sort: "asc" },
  });
}
