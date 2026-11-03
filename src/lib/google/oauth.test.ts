import { describe, it, expect, vi, beforeEach } from "vitest";
import { googleAuthUrl, exchangeCode, refreshAccessToken, saveGoogleAccount, loadGoogleAccount, deleteGoogleAccount } from "@/lib/google/oauth";
import { prisma } from "@/lib/prisma";

describe("google oauth", () => {
  beforeEach(async () => {
    await deleteGoogleAccount();
  });

  it("builds an auth URL with required params", () => {
    const url = googleAuthUrl("cid", "http://localhost/cb", "state123", "https://fake-google");
    expect(url).toContain("client_id=cid");
    expect(url).toContain("state=state123");
    expect(url).toContain("response_type=code");
    expect(url).toContain("access_type=offline");
  });

  it("exchanges a code for tokens", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ access_token: "at", refresh_token: "rt", expires_in: 3600 }), { status: 200, headers: { "content-type": "application/json" } }),
    );
    const origFetch = global.fetch;
    global.fetch = fetchImpl as any;
    try {
      const r = await exchangeCode("code1", "cid", "secret", "http://localhost/cb", "https://fake-google/token");
      expect(r.accessToken).toBe("at");
      expect(r.refreshToken).toBe("rt");
    } finally {
      global.fetch = origFetch;
    }
  });

  it("refreshes an access token", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ access_token: "at2", expires_in: 3600 }), { status: 200, headers: { "content-type": "application/json" } }),
    );
    const origFetch = global.fetch;
    global.fetch = fetchImpl as any;
    try {
      const r = await refreshAccessToken("rt", "cid", "secret", "https://fake-google/token");
      expect(r.accessToken).toBe("at2");
    } finally {
      global.fetch = origFetch;
    }
  });

  it("saves and loads a google account with encrypted refresh token", async () => {
    await saveGoogleAccount("user@gmail.com", "secret-rt", ["gmail.send"], "testsecret12345678901234567890");
    const loaded = await loadGoogleAccount("testsecret12345678901234567890");
    expect(loaded?.email).toBe("user@gmail.com");
    expect(loaded?.refreshToken).toBe("secret-rt");
    // Verify it's encrypted in DB
    const row = await prisma.googleAccount.findUnique({ where: { id: "google" } });
    expect(row?.refreshTokenEnc).not.toBe("secret-rt");
  });
});