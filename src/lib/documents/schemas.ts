import { z } from "zod";

export const documentKindSchema = z.enum(["RESUME", "COVER_LETTER", "EMAIL"]);

export const themeInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
  headFont: z.string().trim().min(1).max(80),
  bodyFont: z.string().trim().min(1).max(80),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  layout: z.enum(["SINGLE", "SIDEBAR_LEFT", "SIDEBAR_RIGHT"]),
  align: z.enum(["LEFT", "JUSTIFY", "CENTRED"]),
  headingStyle: z.enum(["PLAIN", "RULE", "SMALL_CAPS", "UPPERCASE"]),
  density: z.enum(["COMPACT", "REGULAR", "AIRY"]),
  headerStyle: z.enum(["PLAIN", "STACKED", "INLINE", "CENTRED"]),
  sidebarStyle: z.enum(["PLAIN", "SHADED", "RULED"]),
  dateStyle: z.enum(["INLINE", "RIGHT", "UNDER"]),
  photoShape: z.enum(["CIRCLE", "ROUNDED", "SQUARE"]),
  photoPosition: z.enum(["HEADER_START", "HEADER_END", "SIDEBAR_TOP"]),
});

export const unitSchema = z.object({
  id: z.string().min(1),
  text: z.string(),
});

export const documentUnitsSchema = z.array(unitSchema);

export const documentVersionCauseSchema = z.enum([
  "WRITTEN",
  "TRIMMED",
  "REGENERATED",
  "REFINED",
  "UNDONE",
  "BEFORE_RESTORE",
  "RESTORED",
]);
