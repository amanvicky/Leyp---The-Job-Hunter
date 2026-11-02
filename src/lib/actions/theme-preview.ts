import { z } from "zod";
import { serverAction } from "@/lib/action";

const themePreviewSchema = z.object({
  html: z.string().min(1).max(500000),
});

export const previewThemeAction = serverAction(themePreviewSchema, async (input) => {
  // Return the HTML for client-side preview rendering
  return { html: input.html };
});
