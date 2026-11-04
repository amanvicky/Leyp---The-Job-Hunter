import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { syncInbox, parseAddress, headerValue, decodeBody, findBody } from "./inbox-sync";
import { saveGoogleAccount, deleteGoogleAccount } from "./oauth";

const SECRET = "testsecret12345678901234567890";

beforeEach(async () => {
  await prisma.emailMessage.deleteMany({});
  await prisma.application.deleteMany({});
  await deleteGoogleAccount();
});

describe("gmail message helpers", () => {
  it("splits a display name from an address", () => {
    expect(parseAddress("Ada Lovelace <ada@example.com>")).toEqual({
      name: "Ada Lovelace",
      address: "ada@example.com",
    });
  });

  it("handles a bare address", () => {
    expect(parseAddress("ADA@Example.com")).toEqual({ name: "", address: "ada@example.com" });
  });

  it("reads a header regardless of case", () => {
    expect(headerValue({ headers: [{ name: "Subject", value: "Hi" }] }, "subject")).toBe("Hi");
  });

  it("decodes base64url, not just base64", () => {
    // "-_" would be "+/" in standard base64.
    const encoded = Buffer.from("hello world??", "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_");
    expect(decodeBody(encoded)).toBe("hello world??");
  });

  it("finds a nested text/plain part", () => {
    const encoded = Buffer.from("the body", "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_");
    const body = findBody({
      mimeType: "multipart/alternative",
      parts: [{ mimeType: "text/html", body: { data: "PGI-eDwvYj4" } }, { mimeType: "text/plain", body: { data: encoded } }],
    });
    expect(body).toBe("the body");
  });
});

describe("syncInbox", () => {
  it("stores new messages and links by company", async () => {
    await saveGoogleAccount("me@example.com", "rt", ["gmail.readonly"], SECRET);
    const app = await prisma.application.create({ data: { title: "Backend", company: "acme" } });

    const encoded = Buffer.from("We would like to schedule an interview.", "utf8")
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

    const fetchImpl = vi.fn(async (url: string) => {
      if (url.includes("/token")) {
        return new Response(JSON.stringify({ access_token: "at", expires_in: 3600 }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      if (url.includes("labelIds=INBOX")) {
        return new Response(JSON.stringify({ messages: [{ id: "m1" }] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response(
        JSON.stringify({
          id: "m1",
          threadId: "t1",
          internalDate: "1700000000000",
          payload: {
            mimeType: "text/plain",
            body: { data: encoded },
            headers: [
              { name: "From", value: "Recruiter <jobs@acme.com>" },
              { name: "Subject", value: "Interview" },
              { name: "Message-ID", value: "<abc@acme.com>" },
            ],
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    });

    const original = global.fetch;
    global.fetch = fetchImpl as unknown as typeof fetch;
    try {
      const result = await syncInbox(SECRET, "cid", "csecret", "https://fake-gmail");
      expect(result.synced).toBe(1);
      expect(result.linked).toBe(1);

      const stored = await prisma.emailMessage.findUnique({ where: { gmailId: "m1" } });
      expect(stored?.fromAddress).toBe("jobs@acme.com");
      expect(stored?.fromName).toBe("Recruiter");
      expect(stored?.subject).toBe("Interview");
      expect(stored?.direction).toBe("INCOMING");
      expect(stored?.applicationId).toBe(app.id);
      expect(stored?.body).toContain("schedule an interview");
    } finally {
      global.fetch = original;
    }
  });

  it("does not duplicate messages on a second sync", async () => {
    await saveGoogleAccount("me@example.com", "rt", ["gmail.readonly"], SECRET);
    const fetchImpl = vi.fn(async (url: string) => {
      if (url.includes("/token")) {
        return new Response(JSON.stringify({ access_token: "at", expires_in: 3600 }), { status: 200, headers: { "content-type": "application/json" } });
      }
      if (url.includes("labelIds=INBOX")) {
        return new Response(JSON.stringify({ messages: [{ id: "m1" }] }), { status: 200, headers: { "content-type": "application/json" } });
      }
      return new Response(JSON.stringify({ id: "m1", threadId: "t1", payload: { headers: [{ name: "From", value: "a@b.com" }] } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });
    const original = global.fetch;
    global.fetch = fetchImpl as unknown as typeof fetch;
    try {
      await syncInbox(SECRET, "cid", "csecret", "https://fake-gmail");
      await syncInbox(SECRET, "cid", "csecret", "https://fake-gmail");
      expect(await prisma.emailMessage.count()).toBe(1);
    } finally {
      global.fetch = original;
    }
  });
});
