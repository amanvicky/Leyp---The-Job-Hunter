import { prisma } from "@/lib/prisma";
import { serverAction } from "@/lib/action";
import { z } from "zod";

const resumePageSchema = z.object({
  applicationId: z.string().min(1).optional(),
});

export const getResumePageData = serverAction(resumePageSchema, async () => {
  const themes = await prisma.theme.findMany({ orderBy: [{ builtIn: "desc" }, { name: "asc" }] });
  const applications = await prisma.application.findMany({
    where: { awaitingReview: false },
    orderBy: { updatedAt: "desc" },
    take: 20,
    select: { id: true, title: true, company: true },
  });
  return { themes, applications };
});
