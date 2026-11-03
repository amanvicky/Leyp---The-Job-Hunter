import { prisma } from "@/lib/prisma";
import { normaliseSkillName } from "./schemas";
export { normaliseSkillName };

/** How a skill is printed: the label the user typed, else the stored name. */
export function skillLabel(skill: { name: string; label?: string }): string {
  return skill.label?.trim() || skill.name;
}

export async function upsertSkill(name: string, options: { group?: string } = {}) {
  const normalised = normaliseSkillName(name);
  if (!normalised) throw new Error("Skill name is required.");
  const display = name.trim();

  const existing = await prisma.skill.findUnique({ where: { name: normalised } });
  if (existing) {
    const patch: { group?: string; label?: string } = {};
    if (options.group !== undefined && options.group !== existing.group) patch.group = options.group;
    // The first spelling wins: adding "typescript" again must not downgrade
    // an existing "TypeScript". An empty label is still worth filling in.
    if (!existing.label) patch.label = display;
    if (Object.keys(patch).length > 0) {
      return prisma.skill.update({ where: { id: existing.id }, data: patch });
    }
    return existing;
  }

  const maxSort = await prisma.skill.aggregate({ _max: { sort: true } });
  return prisma.skill.create({
    data: {
      name: normalised,
      label: display,
      group: options.group ?? "",
      sort: (maxSort._max.sort ?? 0) + 1,
    },
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

export async function listSkills(): Promise<{ id: string; name: string; label: string; group: string }[]> {
  return prisma.skill.findMany({
    orderBy: [{ group: "asc" }, { sort: "asc" }],
    select: { id: true, name: true, label: true, group: true },
  });
}
