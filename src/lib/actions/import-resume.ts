import { serverAction } from "@/lib/action";
import { z } from "zod";

const importResumeSchema = z.object({
  text: z.string().min(1).max(50000),
});

export const importResumeAction = serverAction(importResumeSchema, async (input) => {
  const nameMatch = input.text.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/m);
  const emailMatch = input.text.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
  const phoneMatch = input.text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3,5}\)?[-.\s]?\d{3,5}[-.\s]?\d{3,5}/);

  const { upsertProfileField } = await import("@/lib/profile/entities");
  if (nameMatch) await upsertProfileField("name", nameMatch[1]!);
  if (emailMatch) await upsertProfileField("email", emailMatch[0]!);
  if (phoneMatch) await upsertProfileField("phone", phoneMatch[0]!);

  return { imported: true, fields: [nameMatch ? "name" : null, emailMatch ? "email" : null, phoneMatch ? "phone" : null].filter(Boolean) };
});
