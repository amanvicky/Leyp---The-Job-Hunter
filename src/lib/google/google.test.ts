import { describe, expect, it, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { upsertGoogleAccount, getGoogleAccount, deleteGoogleAccount, upsertEmailMessage, listEmailMessages, markEmailHandled, linkEmailToApplication } from "./core";

beforeEach(async () => {
  await prisma.emailMessage.deleteMany({});
  await prisma.googleAccount.deleteMany({});
});

describe("google data layer", () => {
  it("stores and retrieves a google account", async () => {
    await upsertGoogleAccount({ email: "a@b.com", refreshTokenEnc: "enc", scopes: "gmail.readonly" });
    const account = await getGoogleAccount();
    expect(account?.email).toBe("a@b.com");
    expect(account?.refreshTokenEnc).toBe("enc");
  });

  it("replaces the account on re-connect", async () => {
    await upsertGoogleAccount({ email: "old@b.com", refreshTokenEnc: "old" });
    await upsertGoogleAccount({ email: "new@b.com", refreshTokenEnc: "new" });
    const account = await getGoogleAccount();
    expect(account?.email).toBe("new@b.com");
    expect(await (await import("@/lib/prisma")).prisma.googleAccount.count()).toBe(1);
  });

  it("deletes the account", async () => {
    await upsertGoogleAccount({ email: "a@b.com", refreshTokenEnc: "enc" });
    await deleteGoogleAccount();
    expect(await getGoogleAccount()).toBeNull();
  });

  it("upserts an email message", async () => {
    await upsertEmailMessage({
      gmailId: "g1",
      threadId: "t1",
      direction: "INCOMING",
      fromAddress: "sender@example.com",
      subject: "Re: application",
      body: "Thanks for applying.",
      sentAt: "2026-01-01T10:00:00Z",
    });
    const list = await listEmailMessages({ direction: "INCOMING" });
    expect(list).toHaveLength(1);
    expect(list[0]?.subject).toBe("Re: application");
  });

  it("marks an email handled and links it to an application", async () => {
    const app = await (await import("@/lib/prisma")).prisma.application.create({ data: { title: "T", company: "C" } });
    await upsertEmailMessage({ gmailId: "g2", threadId: "t2", direction: "INCOMING", sentAt: "2026-01-01T10:00:00Z" });
    const email = await (await import("@/lib/prisma")).prisma.emailMessage.findUnique({ where: { gmailId: "g2" } });
    await markEmailHandled(email!.id);
    await linkEmailToApplication(email!.id, app.id);
    const updated = await (await import("@/lib/prisma")).prisma.emailMessage.findUnique({ where: { id: email!.id } });
    expect(updated?.handledAt).not.toBeNull();
    expect(updated?.applicationId).toBe(app.id);
  });

  it("filters emails by application", async () => {
    const app = await (await import("@/lib/prisma")).prisma.application.create({ data: { title: "T", company: "C" } });
    await upsertEmailMessage({ gmailId: "g3", threadId: "t3", direction: "INCOMING", applicationId: app.id, sentAt: "2026-01-01T10:00:00Z" });
    await upsertEmailMessage({ gmailId: "g4", threadId: "t4", direction: "INCOMING", sentAt: "2026-01-01T10:00:00Z" });
    const linked = await listEmailMessages({ applicationId: app.id });
    expect(linked).toHaveLength(1);
  });
});
