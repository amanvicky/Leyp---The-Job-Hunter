"use server";

import { prisma } from "@/lib/prisma";
import { serverAction } from "@/lib/action";
import { z } from "zod";
import { renderPdf } from "@/lib/pdf/render";
import { renderResumeHtml, type ResumeProfile, type ResumeTheme } from "@/lib/pdf/resume-html";
import { skillLabel } from "@/lib/profile/skills";

const renderResumeSchema = z.object({
  themeId: z.string().min(1).optional(),
  applicationId: z.string().min(1).optional(),
});

/** Turn the flat profile rows into the shape the renderer wants. */
async function loadProfile(): Promise<ResumeProfile> {
  const fields = await prisma.profileField.findMany();
  const fieldMap: Record<string, string> = {};
  for (const field of fields) fieldMap[field.key] = field.value;

  const skills = await prisma.skill.findMany({ orderBy: [{ sort: "asc" }, { name: "asc" }] });
  const experiences = await prisma.experience.findMany({
    include: { skills: { include: { skill: true } } },
    orderBy: [{ sort: "asc" }, { createdAt: "desc" }],
  });
  const projects = await prisma.project.findMany({
    include: { skills: { include: { skill: true } } },
    orderBy: [{ sort: "asc" }, { createdAt: "desc" }],
  });
  const educations = await prisma.education.findMany({ orderBy: [{ sort: "asc" }, { createdAt: "desc" }] });
  const languages = await prisma.language.findMany({ orderBy: [{ sort: "asc" }, { name: "asc" }] });
  const publications = await prisma.publication.findMany({
    where: { onResumes: true },
    orderBy: { sort: "asc" },
  });

  return {
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
      skills: experience.skills.map((link) => skillLabel(link.skill)),
    })),
    projects: projects.map((project) => ({
      name: project.name,
      link: project.link,
      startYear: project.startYear,
      endYear: project.endYear,
      current: project.current,
      bullets: project.bullets,
      skills: project.skills.map((link) => skillLabel(link.skill)),
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
}

async function resolveTheme(themeId?: string): Promise<ResumeTheme> {
  const theme = themeId
    ? await prisma.theme.findUnique({ where: { id: themeId } })
    : await prisma.theme.findFirst({ where: { builtIn: true }, orderBy: { name: "asc" } });

  if (!theme) throw new Error("No theme is available. Run the seed script first.");

  return {
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
}

const previewSchema = z.object({ themeId: z.string().min(1).optional() });

/** The HTML behind the preview pane. No PDF yet, so switching theme is instant. */
export const previewResumeAction = serverAction(previewSchema, async (input) => {
  const [profile, theme] = await Promise.all([loadProfile(), resolveTheme(input.themeId)]);
  return { html: renderResumeHtml(profile, theme), theme: theme.name };
});

export const renderResumePdfAction = serverAction(renderResumeSchema, async (input) => {
  const [profile, theme] = await Promise.all([loadProfile(), resolveTheme(input.themeId)]);
  const html = renderResumeHtml(profile, theme);
  const pdf = await renderPdf(html);

  await prisma.job.create({
    data: {
      type: "render-pdf",
      applicationId: input.applicationId ?? null,
      input: JSON.stringify({ themeId: input.themeId ?? null, theme: theme.name }),
      status: "DONE",
      result: JSON.stringify({ bytes: pdf.length }),
      finishedAt: new Date(),
    },
  });

  return { bytes: pdf.length, base64: pdf.toString("base64"), theme: theme.name };
});
