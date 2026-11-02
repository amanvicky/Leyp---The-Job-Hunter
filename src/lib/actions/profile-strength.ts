import { prisma } from "@/lib/prisma";
import { serverAction } from "@/lib/action";
import { z } from "zod";

const profilePageSchema = z.object({
  applicationId: z.string().min(1),
});

export const getProfileStrengthAction = serverAction(profilePageSchema, async (input) => {
  const { prisma: p } = await import("@/lib/prisma");
  const fields = await p.profileField.findMany();
  const fieldMap: Record<string, string> = {};
  for (const f of fields) fieldMap[f.key] = f.value;

  const skillCount = await p.skill.count();
  const experienceCount = await p.experience.count();
  const hasBullets = (await p.experience.findMany({ select: { bullets: true } })).some((e) => e.bullets.length > 0);
  const educationCount = await p.education.count();

  const { basicsScore, skillsScore, experienceScore, educationScore, computeStrength } = await import("@/lib/profile/strength");
  const strength = computeStrength({
    basics: basicsScore(fieldMap),
    skills: skillsScore(skillCount),
    experience: experienceScore(experienceCount, hasBullets),
    education: educationScore(educationCount),
  });

  return strength;
});
