import { prisma } from "@/lib/prisma";
import { normaliseSkillName } from "./schemas";
export { normaliseSkillName };

export async function upsertSkill(name: string, options: { group?: string } = {}) {
  const normalised = normaliseSkillName(name);
  if (!normalised) throw new Error("Skill name is required.");
  const existing = await prisma.skill.findUnique({ where: { name: normalised } });
  if (existing) {
    if (options.group !== undefined && options.group !== existing.group) {
      return prisma.skill.update({ where: { id: existing.id }, data: { group: options.group } });
    }
    return existing;
  }
  const maxSort = await prisma.skill.aggregate({ _max: { sort: true } });
  return prisma.skill.create({
    data: { name: normalised, group: options.group ?? "", sort: (maxSort._max.sort ?? 0) + 1 },
  });
}

export async function removeSkill(id: string): Promise<void> {
  await prisma.skill.delete({ where: { id } });
}

export async function attachSkillToExperience(experienceId: string, skillId: string): Promise<void> {
  await prisma.experienceSkill.upsert({
    where: { experienceId_skillId: { experienceId, skillId } },
    create: { experienceId, skillId },
    update: {},
  });
}

export async function detachSkillFromExperience(experienceId: string, skillId: string): Promise<void> {
  await prisma.experienceSkill.deleteMany({ where: { experienceId, skillId } });
}

export async function listSkills(): Promise<{ id: string; name: string; group: string }[]> {
  return prisma.skill.findMany({ orderBy: [{ group: "asc" }, { sort: "asc" }] });
}
