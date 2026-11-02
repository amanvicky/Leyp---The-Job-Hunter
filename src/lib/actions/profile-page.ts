import { prisma } from "@/lib/prisma";
import { serverAction } from "@/lib/action";
import { z } from "zod";

const profilePageSchema = z.object({});

export const getProfilePageData = serverAction(profilePageSchema, async () => {
  const fields = await prisma.profileField.findMany();
  const fieldMap: Record<string, string> = {};
  for (const f of fields) fieldMap[f.key] = f.value;

  const skills = await prisma.skill.findMany({ orderBy: [{ group: "asc" }, { sort: "asc" }] });
  const experiences = await prisma.experience.findMany({
    include: { skills: { include: { skill: true } } },
    orderBy: { sort: "asc" },
  });
  const projects = await prisma.project.findMany({
    include: { skills: { include: { skill: true } } },
    orderBy: { sort: "asc" },
  });
  const educations = await prisma.education.findMany({ orderBy: { sort: "asc" } });
  const languages = await prisma.language.findMany({ orderBy: { sort: "asc" } });
  const publications = await prisma.publication.findMany({ orderBy: { sort: "asc" } });
  const references = await prisma.reference.findMany({ orderBy: { sort: "asc" } });
  const facts = await prisma.fact.findMany({ orderBy: { sort: "asc" } });

  return {
    fields: fieldMap,
    skills,
    experiences,
    projects,
    educations,
    languages,
    publications,
    references,
    facts,
  };
});
