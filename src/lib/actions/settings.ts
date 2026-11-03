"use server";

import { serverAction } from "@/lib/action";
import { z } from "zod";
import { saveAiConfig } from "@/lib/ai/config-store";
import { aiConfigSchema } from "@/lib/ai/config";

const schema = aiConfigSchema;

export const saveAiSettingsAction = serverAction(schema, async (input) => {
  await saveAiConfig(input);
  return { saved: true };
});

export const loadAiSettingsAction = serverAction(z.object({}), async () => {
  const { loadAiConfig } = await import("@/lib/ai/config-store");
  const config = await loadAiConfig();
  return { config };
});
