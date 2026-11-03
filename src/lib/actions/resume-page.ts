import { prisma } from "@/lib/prisma";
import { serverAction } from "@/lib/action";
import { z } from "zod";
import { renderResumeHtml, type ResumeProfile, type ResumeTheme } from "@/lib/pdf/resume-html";
import { skillLabel } from "@/lib/profile/skills";

const resumePageSchema = z.object({
  applicationId: z.string().min(1).optional(),
});

export const getResumePageData = serverAction(resumePageSchema, async () => {
  const themes = await prisma.theme.findMany({
    orderBy: [{ builtIn: "desc" }, { name: "asc" }],
    select: { id: true, name: true, builtIn: true },
  });

  const chosen = themes[0] ?? null;
  if (!chosen) return { themes, defaultThemeId: null, defaultHtml: "" };

  const theme = await prisma.theme.findUniqueOrThrow({ where: { id: chosen.id } });
  const fields = await prisma.profileField.findMany();
  const fieldMap: Record<string, string> = {};
  for (const field of fields) fieldMap[field.key] = field.value;

  const [skills, experiences, projects, educations, languages, publications] = await Promise.all([
    prisma.skill.findMany({ orderBy: [{ sort: "asc" }, { name: "asc" }] }),
    prisma.experience.findMany({ orderBy: [{ sort: "asc" }, { createdAt: "desc" }] }),
    prisma.project.findMany({ orderBy: [{ sort: "asc" }, { createdAt: "desc" }] }),
    prisma.education.findMany({ orderBy: [{ sort: "asc" }, { createdAt: "desc" }] }),
    prisma.language.findMany({ orderBy: [{ sort: "asc" }, { name: "asc" }] }),
    prisma.publication.findMany({ where: { onResumes: true }, orderBy: { sort: "asc" } }),
  ]);

  const profile: ResumeProfile = {
    fields: fieldMap,
    skills: skills.map((skill) => ({ name: skillLabel(skill), group: skill.group })),
    experiences: experiences.map((experience) => ({
      role: experience.role,
      company: experience.company,
      location: experience.location,
      descriptor: experience.descriptor,
      startYear: experience.startYear,
      startMonth: experience.startMonth,
      endYear: experience.endYear,
      endMonth: experience.endMonth,
      current: experience.current,
      bullets: experience.bullets,
    })),
    projects: projects.map((project) => ({
      name: project.name,
      link: project.link,
      startYear: project.startYear,
      endYear: project.endYear,
      current: project.current,
      bullets: project.bullets,
    })),
    educations: educations.map((education) => ({
      degree: education.degree,
      school: education.school,
      startYear: education.startYear,
      endYear: education.endYear,
      current: education.current,
      notes: education.notes,
    })),
    languages: languages.map((language) => ({ name: language.name, level: language.level })),
    publications: publications.map((publication) => ({ citation: publication.citation, link: publication.link })),
  };

  const resumeTheme: ResumeTheme = {
    name: theme.name,
    headFont: theme.headFont,
    bodyFont: theme.bodyFont,
    accent: theme.accent,
    layout: theme.layout as ResumeTheme["layout"],
    align: theme.align as ResumeTheme["align"],
    headingStyle: theme.headingStyle as ResumeTheme["headingStyle"],
    density: theme.density as ResumeTheme["density"],
    headerStyle: theme.headerStyle as ResumeTheme["headerStyle"],
    sidebarStyle: theme.sidebarStyle as ResumeTheme["sidebarStyle"],
    dateStyle: theme.dateStyle as ResumeTheme["dateStyle"],
    photoShape: theme.photoShape as ResumeTheme["photoShape"],
    photoPosition: theme.photoPosition as ResumeTheme["photoPosition"],
  };

  return {
    themes,
    defaultThemeId: chosen.id,
    defaultHtml: renderResumeHtml(profile, resumeTheme),
  };
});
