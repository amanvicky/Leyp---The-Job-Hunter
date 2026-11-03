"use server";

import { prisma } from "@/lib/prisma";
import { serverAction } from "@/lib/action";
import { z } from "zod";

const createThemeSchema = z.object({
  name: z.string().trim().min(1).max(80),
  headFont: z.string().trim().min(1).max(80),
  bodyFont: z.string().trim().min(1).max(80),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  layout: z.enum(["SINGLE", "SIDEBAR_LEFT", "SIDEBAR_RIGHT"]).default("SINGLE"),
  align: z.enum(["LEFT", "JUSTIFY", "CENTRED"]).default("LEFT"),
  headingStyle: z.enum(["PLAIN", "RULE", "SMALL_CAPS", "UPPERCASE"]).default("PLAIN"),
  density: z.enum(["COMPACT", "REGULAR", "AIRY"]).default("REGULAR"),
  headerStyle: z.enum(["PLAIN", "STACKED", "INLINE", "CENTRED"]).default("PLAIN"),
  sidebarStyle: z.enum(["PLAIN", "SHADED", "RULED"]).default("PLAIN"),
  dateStyle: z.enum(["INLINE", "RIGHT", "UNDER"]).default("INLINE"),
  photoShape: z.enum(["CIRCLE", "ROUNDED", "SQUARE"]).default("CIRCLE"),
  photoPosition: z.enum(["HEADER_START", "HEADER_END", "SIDEBAR_TOP"]).default("HEADER_END"),
});

export const createThemeAction = serverAction(createThemeSchema, async (input) => {
  const { prisma: p } = await import("@/lib/prisma");
  return p.theme.create({ data: { ...input, builtIn: false } });
});

const updateThemeSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(80).optional(),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

export const updateThemeAction = serverAction(updateThemeSchema, async (input) => {
  const { prisma: p } = await import("@/lib/prisma");
  const { id, ...patch } = input;
  return p.theme.update({ where: { id }, data: patch });
});

const deleteThemeSchema = z.object({ id: z.string().min(1) });

export const deleteThemeAction = serverAction(deleteThemeSchema, async (input) => {
  const { prisma: p } = await import("@/lib/prisma");
  const theme = await p.theme.findUnique({ where: { id: input.id } });
  if (!theme) throw new Error("Theme not found.");
  if (theme.builtIn) throw new Error("Built-in themes cannot be deleted.");
  await p.theme.delete({ where: { id: input.id } });
  return { deleted: true };
});
