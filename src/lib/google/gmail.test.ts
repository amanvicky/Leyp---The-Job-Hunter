import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendEmail } from "@/lib/google/gmail";
import { saveGoogleAccount, deleteGoogleAccount } from "@/lib/google/oauth";
import { prisma } from "@/lib/prisma";

describe("gmail send", () => {
  beforeEach(async () => {
    await deleteGoogleAccount();
    await saveGoogleAccount("user@gmail.com", "rt", ["gmail.send"], "testsecret12345678901234567890");
  });

  it("sends an email via the Gmail API", async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (url.includes("/token")) {
        return new Response(JSON.stringify({ access_token: "at", expires_in: 3600 }), { status: 200, headers: { "content-type": "application/json" } });
      }
      return new Response(JSON.stringify({ id: "msg1", threadId: "thr1" }), { status: 200, headers: { "content-type": "application/json" } });
    });
    const origFetch = global.fetch;
    global.fetch = fetchImpl as any;
    try {
      const r = await sendEmail("to@example.com", "Hi", "Hello", "testsecret12345678901234567890", "cid", "secret", "https://fake-gmail");
      expect(r.messageId).toBe("msg1");
      expect(r.threadId).toBe("thr1");
    } finally {
      global.fetch = origFetch;
    }
  });
});