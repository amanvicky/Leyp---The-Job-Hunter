import { describe, expect, it, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { upsertDocument, getDocument, saveVersion, listVersions, restoreVersion, setDocumentTheme } from "./core";

beforeEach(async () => {
  await prisma.documentVersion.deleteMany({});
  await prisma.document.deleteMany({});
  await prisma.theme.deleteMany({});
  await prisma.application.deleteMany({});
});

describe("documents", () => {
  async function makeApp() {
    return prisma.application.create({ data: { title: "T", company: "C" } });
  }

  it("creates and retrieves a document", async () => {
    const app = await makeApp();
    await upsertDocument(app.id, "RESUME", [{ id: "1", text: "Hello" }]);
    const doc = await getDocument(app.id, "RESUME");
    expect(doc?.units).toEqual([{ id: "1", text: "Hello" }]);
  });

  it("enforces one document per kind per application", async () => {
    const app = await makeApp();
    await upsertDocument(app.id, "RESUME", [{ id: "1", text: "A" }]);
    await upsertDocument(app.id, "RESUME", [{ id: "1", text: "B" }]);
    const doc = await getDocument(app.id, "RESUME");
    expect(doc?.units).toEqual([{ id: "1", text: "B" }]);
  });

  it("saves and lists versions", async () => {
    const app = await makeApp();
    const doc = await upsertDocument(app.id, "RESUME", [{ id: "1", text: "v1" }]);
    await saveVersion(doc.id, [{ id: "1", text: "v1" }], "WRITTEN");
    await saveVersion(doc.id, [{ id: "1", text: "v2" }], "REFINED", "tighter");
    const versions = await listVersions(doc.id);
    expect(versions).toHaveLength(2);
    expect(versions[0]?.cause).toBe("REFINED");
  });

  it("restores a previous version", async () => {
    const app = await makeApp();
    const doc = await upsertDocument(app.id, "RESUME", [{ id: "1", text: "current" }]);
    const version = await saveVersion(doc.id, [{ id: "1", text: "old" }], "WRITTEN");
    await restoreVersion(doc.id, version.id);
    const restored = await getDocument(app.id, "RESUME");
    expect(restored?.units).toEqual([{ id: "1", text: "old" }]);
  });

  it("attaches a theme", async () => {
    const app = await makeApp();
    const theme = await prisma.theme.create({ data: { name: "T", headFont: "A", bodyFont: "B", accent: "#000000", builtIn: true } });
    const doc = await upsertDocument(app.id, "COVER_LETTER", [{ id: "1", text: "x" }]);
    await setDocumentTheme(doc.id, theme.id);
    const updated = await getDocument(app.id, "COVER_LETTER");
    expect(updated?.themeId).toBe(theme.id);
  });
});
