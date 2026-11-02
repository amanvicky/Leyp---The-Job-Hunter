import { describe, expect, it, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { createApplication, transitionStatus, listApplications, archiveApplication, addNote, listNotes } from "./core";

beforeEach(async () => {
  await prisma.statusEvent.deleteMany({});
  await prisma.note.deleteMany({});
  await prisma.application.deleteMany({});
});

describe("applications", () => {
  it("creates a draft application", async () => {
    const app = await createApplication({ title: "Backend Engineer", company: "Acme" });
    expect(app.status).toBe("DRAFT");
    expect(app.origin).toBe("MANUAL");
  });

  it("lists only non-archived, non-review applications", async () => {
    const a = await createApplication({ title: "A", company: "C" });
    await createApplication({ title: "B", company: "C" });
    await archiveApplication(a.id);
    const list = await listApplications();
    expect(list).toHaveLength(1);
    expect(list[0]?.title).toBe("B");
  });

  it("records a status transition", async () => {
    const app = await createApplication({ title: "T", company: "C" });
    await transitionStatus(app.id, "SENT");
    const updated = await (await import("@/lib/prisma")).prisma.application.findUnique({ where: { id: app.id } });
    expect(updated?.status).toBe("SENT");
    expect(updated?.sentAt).not.toBeNull();
    const events = await (await import("@/lib/prisma")).prisma.statusEvent.findMany({ where: { applicationId: app.id } });
    expect(events).toHaveLength(1);
    expect(events[0]?.from).toBe("DRAFT");
    expect(events[0]?.to).toBe("SENT");
  });

  it("is idempotent when the status is unchanged", async () => {
    const app = await createApplication({ title: "T", company: "C" });
    await transitionStatus(app.id, "DRAFT");
    expect(await (await import("@/lib/prisma")).prisma.statusEvent.count({ where: { applicationId: app.id } })).toBe(0);
  });

  it("tracks the furthest stage monotonically", async () => {
    const app = await createApplication({ title: "T", company: "C" });
    await transitionStatus(app.id, "SENT");
    await transitionStatus(app.id, "INTERVIEW");
    await transitionStatus(app.id, "SCREENING"); // backwards
    const final = await (await import("@/lib/prisma")).prisma.application.findUnique({ where: { id: app.id } });
    expect(final?.status).toBe("SCREENING");
    expect(final?.furthestStage).toBe("INTERVIEW");
  });

  it("adds a note on a transition when one is supplied", async () => {
    const app = await createApplication({ title: "T", company: "C" });
    await transitionStatus(app.id, "REJECTED", "They went with someone else.");
    const notes = await (await import("./core")).listNotes(app.id);
    expect(notes).toHaveLength(1);
    expect(notes[0]?.body).toContain("someone else");
  });

  it("adds a standalone note", async () => {
    const app = await createApplication({ title: "T", company: "C" });
    await addNote(app.id, "Called the recruiter.");
    const notes = await listNotes(app.id);
    expect(notes).toHaveLength(1);
  });
});
