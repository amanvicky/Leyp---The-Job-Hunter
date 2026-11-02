import { serverAction } from "@/lib/action";
import { z } from "zod";
import { profileBasicsSchema } from "@/lib/documents/writing-schemas";
import { upsertProfileField } from "@/lib/profile/entities";
import { upsertSkill } from "@/lib/profile/skills";
import { createExperience } from "@/lib/profile/experiences";
import { createProject } from "@/lib/profile/projects";
import { createEducation } from "@/lib/profile/entities";
import { createLanguage } from "@/lib/profile/entities";
import { createFact } from "@/lib/profile/entities";

export const saveBasicsAction = serverAction(profileBasicsSchema, async (input) => {
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined && value !== null && value !== "") {
      await upsertProfileField(key, String(value));
    }
  }
  return { saved: true };
});

const skillSchema = z.object({ name: z.string().trim().min(1).max(60), group: z.string().trim().max(60).optional() });

export const addSkillAction = serverAction(skillSchema, async (input) => {
  return upsertSkill(input.name, { group: input.group });
});

const experienceSchema = (await import("@/lib/profile/schemas")).experienceSchema;

export const addExperienceAction = serverAction(experienceSchema, async (input) => {
  return createExperience(input);
});

const projectSchema = (await import("@/lib/profile/schemas")).projectSchema;

export const addProjectAction = serverAction(projectSchema, async (input) => {
  return createProject(input);
});

const educationSchema = (await import("@/lib/profile/schemas")).educationSchema;

export const addEducationAction = serverAction(educationSchema, async (input) => {
  return createEducation(input);
});

const languageSchema = (await import("@/lib/profile/schemas")).languageSchema;

export const addLanguageAction = serverAction(languageSchema, async (input) => {
  return createLanguage(input);
});

const factSchema = (await import("@/lib/profile/schemas")).factSchema;

export const addFactAction = serverAction(factSchema, async (input) => {
  return createFact(input);
});
