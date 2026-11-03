"use server";

import { prisma } from "@/lib/prisma";
import { serverAction } from "@/lib/action";
import { z } from "zod";
import { renderPdf } from "@/lib/pdf/render";

const renderResumeSchema = z.object({
  applicationId: z.string().min(1),
  html: z.string().min(1).max(500000),
});

export const renderResumePdfAction = serverAction(renderResumeSchema, async (input) => {
  const pdf = await renderPdf(input.html);
  // Store a record that this application had a PDF rendered
  await prisma.job.create({
    data: {
      type: "render-pdf",
      input: JSON.stringify({ applicationId: input.applicationId }),
      status: "DONE",
      result: JSON.stringify({ bytes: pdf.length }),
    },
  });
  return { bytes: pdf.length, base64: pdf.toString("base64") };
});
