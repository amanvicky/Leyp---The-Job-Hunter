import { describe, expect, it, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { addChatMessage, listChatMessages, markChatMessageUndone } from "./core";

beforeEach(async () => {
  await prisma.chatMessage.deleteMany({});
  await prisma.application.deleteMany({});
});

describe("chat", () => {
  async function makeApp() {
    return prisma.application.create({ data: { title: "T", company: "C" } });
  }

  it("stores a user message", async () => {
    const app = await makeApp();
    await addChatMessage({ applicationId: app.id, role: "USER", text: "Make the intro shorter." });
    const messages = await listChatMessages(app.id);
    expect(messages).toHaveLength(1);
    expect(messages[0]?.role).toBe("USER");
  });

  it("stores edits as JSON", async () => {
    const app = await makeApp();
    await addChatMessage({
      applicationId: app.id,
      role: "AI",
      text: "Done.",
      edits: [{ unitId: "1", previousText: "old", newText: "new" }],
    });
    const messages = await listChatMessages(app.id);
    expect(messages[0]?.edits).toEqual([{ unitId: "1", previousText: "old", newText: "new" }]);
  });

  it("marks a message undone", async () => {
    const app = await makeApp();
    const message = await addChatMessage({ applicationId: app.id, role: "AI", text: "x" });
    await markChatMessageUndone(message.id);
    const messages = await listChatMessages(app.id);
    expect(messages[0]?.undone).toBe(true);
  });

  it("orders messages by creation time", async () => {
    const app = await makeApp();
    await addChatMessage({ applicationId: app.id, role: "USER", text: "first" });
    await addChatMessage({ applicationId: app.id, role: "AI", text: "second" });
    const messages = await listChatMessages(app.id);
    expect(messages.map((m) => m.text)).toEqual(["first", "second"]);
  });
});
