import { describe, expect, it } from "vitest";
import { prisma } from "./prisma";

/**
 * Runs against the real SQLite file the migration created.
 * Each test cleans up after itself so repeats stay green.
 */
describe("database", () => {
  it("stores and reads a setting", async () => {
    await prisma.setting.upsert({
      where: { key: "test:tone" },
      create: { key: "test:tone", value: "WARM" },
      update: { value: "WARM" },
    });
    const found = await prisma.setting.findUnique({ where: { key: "test:tone" } });
    expect(found?.value).toBe("WARM");
    await prisma.setting.delete({ where: { key: "test:tone" } });
  });

  it("enforces the unique skill name", async () => {
    await prisma.skill.create({ data: { id: "s1", name: "python" } });
    await expect(prisma.skill.create({ data: { id: "s2", name: "python" } })).rejects.toThrow();
    await prisma.skill.delete({ where: { id: "s1" } });
  });

  it("cascades deletes from an application to its documents", async () => {
    const app = await prisma.application.create({ data: { title: "Backend Engineer", company: "Acme" } });
    await prisma.document.create({
      data: { applicationId: app.id, kind: "RESUME", units: "[]" },
    });
    await prisma.application.delete({ where: { id: app.id } });
    expect(await prisma.document.count({ where: { applicationId: app.id } })).toBe(0);
  });

  it("rejects a second document of the same kind for one application", async () => {
    const app = await prisma.application.create({ data: { title: "T", company: "C" } });
    await prisma.document.create({ data: { applicationId: app.id, kind: "RESUME", units: "[]" } });
    await expect(
      prisma.document.create({ data: { applicationId: app.id, kind: "RESUME", units: "[]" } }),
    ).rejects.toThrow();
    await prisma.application.delete({ where: { id: app.id } });
  });

  it("keeps agent drafts out of a normal application query", async () => {
    await prisma.application.create({
      data: { title: "Hidden", company: "C", awaitingReview: true, origin: "AGENT" },
    });
    const visible = await prisma.application.findMany({ where: { awaitingReview: false } });
    expect(visible.some((row) => row.title === "Hidden")).toBe(false);
    await prisma.application.deleteMany({ where: { title: "Hidden" } });
  });
});
