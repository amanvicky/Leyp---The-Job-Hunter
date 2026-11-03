import { prisma } from "@/lib/prisma";
import { serverAction } from "@/lib/action";
import { z } from "zod";
import { basicsScore, computeStrength, educationScore, experienceScore, skillsScore } from "@/lib/profile/strength";

const strengthSchema = z.object({});

export const getProfileStrengthAction = serverAction(strengthSchema, async () => {
  const fields = await prisma.profileField.findMany();
  const fieldMap: Record<string, string> = {};
  for (const field of fields) fieldMap[field.key] = field.value;

  const [skillCount, experienceCount, withBullets, educationCount] = await Promise.all([
    prisma.skill.count(),
    prisma.experience.count(),
    prisma.experience.count({ where: { bullets: { not: "" } } }),
    prisma.education.count(),
  ]);

  return computeStrength({
    basics: basicsScore(fieldMap),
    skills: skillsScore(skillCount),
    experience: experienceScore(experienceCount, withBullets > 0),
    education: educationScore(educationCount),
  });
});
