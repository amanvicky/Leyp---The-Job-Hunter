import { prisma } from "@/lib/prisma";

/**
 * The built-in themes. Each pairs a heading font with a body font and a set of
 * layout switches, so the PDF renderer only ever reads data.
 */
export const BUILT_IN_THEMES = [
  {
    input: {
      name: "Editorial",
      headFont: "Source Serif 4",
      bodyFont: "Source Sans 3",
      accent: "#1f3a5f",
      layout: "SINGLE",
      align: "LEFT",
      headingStyle: "RULE",
      density: "REGULAR",
      headerStyle: "STACKED",
      sidebarStyle: "PLAIN",
      dateStyle: "RIGHT",
      photoShape: "CIRCLE",
      photoPosition: "HEADER_END",
    },
  },
  {
    input: {
      name: "Modern",
      headFont: "Inter",
      bodyFont: "Inter",
      accent: "#0f766e",
      layout: "SINGLE",
      align: "LEFT",
      headingStyle: "PLAIN",
      density: "REGULAR",
      headerStyle: "INLINE",
      sidebarStyle: "PLAIN",
      dateStyle: "INLINE",
      photoShape: "ROUNDED",
      photoPosition: "HEADER_START",
    },
  },
  {
    input: {
      name: "Classic",
      headFont: "EB Garamond",
      bodyFont: "Lato",
      accent: "#5b4636",
      layout: "SIDEBAR_LEFT",
      align: "JUSTIFY",
      headingStyle: "SMALL_CAPS",
      density: "COMPACT",
      headerStyle: "CENTRED",
      sidebarStyle: "SHADED",
      dateStyle: "RIGHT",
      photoShape: "CIRCLE",
      photoPosition: "SIDEBAR_TOP",
    },
  },
  {
    input: {
      name: "Compact",
      headFont: "IBM Plex Sans",
      bodyFont: "IBM Plex Sans",
      accent: "#334155",
      layout: "SINGLE",
      align: "LEFT",
      headingStyle: "UPPERCASE",
      density: "COMPACT",
      headerStyle: "INLINE",
      sidebarStyle: "PLAIN",
      dateStyle: "INLINE",
      photoShape: "SQUARE",
      photoPosition: "HEADER_END",
    },
  },
  {
    input: {
      name: "Bold",
      headFont: "Playfair Display",
      bodyFont: "Roboto",
      accent: "#b91c1c",
      layout: "SIDEBAR_RIGHT",
      align: "LEFT",
      headingStyle: "RULE",
      density: "AIRY",
      headerStyle: "STACKED",
      sidebarStyle: "RULED",
      dateStyle: "UNDER",
      photoShape: "ROUNDED",
      photoPosition: "HEADER_START",
    },
  },
  {
    input: {
      name: "Minimal",
      headFont: "Helvetica Neue",
      bodyFont: "Helvetica Neue",
      accent: "#111111",
      layout: "SINGLE",
      align: "LEFT",
      headingStyle: "PLAIN",
      density: "AIRY",
      headerStyle: "CENTRED",
      sidebarStyle: "PLAIN",
      dateStyle: "RIGHT",
      photoShape: "CIRCLE",
      photoPosition: "HEADER_END",
    },
  },
] as const;

const DEFAULT_SETTINGS: { key: string; value: string }[] = [
  { key: "profile.name", value: "" },
  { key: "profile.email", value: "" },
  { key: "resume.defaultTheme", value: "Editorial" },
  { key: "applications.defaultTone", value: "WARM" },
  { key: "agent.enabled", value: "false" },
  { key: "agent.matchThreshold", value: "70" },
  { key: "search.country", value: "in" },
  { key: "inbox.pollMinutes", value: "15" },
];

/** Idempotent: running it twice leaves one copy of everything. */
export async function seed(): Promise<{ themes: number; settings: number }> {
  let themes = 0;
  for (const theme of BUILT_IN_THEMES) {
    const existing = await prisma.theme.findFirst({ where: { name: theme.input.name, builtIn: true } });
    if (existing) {
      await prisma.theme.update({ where: { id: existing.id }, data: theme.input });
    } else {
      await prisma.theme.create({ data: { ...theme.input, builtIn: true } });
    }
    themes += 1;
  }

  for (const setting of DEFAULT_SETTINGS) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      create: setting,
      update: {}, // never overwrite a value the user has changed
    });
  }

  return { themes, settings: DEFAULT_SETTINGS.length };
}

/** Wide-open on purpose: resetting a single-user local app is routine. */
export async function resetAndSeed(): Promise<void> {
  await prisma.$transaction([
    prisma.documentVersion.deleteMany({}),
    prisma.document.deleteMany({}),
    prisma.chatMessage.deleteMany({}),
    prisma.note.deleteMany({}),
    prisma.fact.deleteMany({}),
    prisma.statusEvent.deleteMany({}),
    prisma.emailMessage.deleteMany({}),
    prisma.job.deleteMany({}),
    prisma.agentCandidate.deleteMany({}),
    prisma.startup.deleteMany({}),
    prisma.application.deleteMany({}),
    prisma.posting.deleteMany({}),
    prisma.experienceSkill.deleteMany({}),
    prisma.projectSkill.deleteMany({}),
    prisma.skill.deleteMany({}),
    prisma.experience.deleteMany({}),
    prisma.project.deleteMany({}),
    prisma.education.deleteMany({}),
    prisma.publication.deleteMany({}),
    prisma.reference.deleteMany({}),
    prisma.language.deleteMany({}),
    prisma.profileField.deleteMany({}),
    prisma.loginThrottle.deleteMany({}),
  ]);
  await seed();
}
