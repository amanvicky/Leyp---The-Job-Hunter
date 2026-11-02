import { describe, expect, it, vi } from "vitest";
import { wrapRoute, sameOrigin, json } from "./route-core";

const ok = async () => new Response("ok");
const signedIn = { getSession: async () => ({ fingerprint: "fp" }), logError: vi.fn() };
const signedOut = { getSession: async () => null, logError: vi.fn() };

function req(url: string, headers: Record<string, string> = {}): Request {
  return new Request(url, { headers });
}

describe("route", () => {
  it("marks responses private and uncached", async () => {
    const GET = wrapRoute(ok, signedIn);
    const res = await GET(req("http://localhost/api/x"), {});
    expect(res.headers.get("cache-control")).toBe("private, no-store");
  });

  it("keeps a handler's own cache policy", async () => {
    const GET = wrapRoute(async () => new Response("ok", { headers: { "cache-control": "public, max-age=60" } }), signedIn);
    const res = await GET(req("http://localhost/api/x"), {});
    expect(res.headers.get("cache-control")).toBe("public, max-age=60");
  });

  it("rejects a cross-origin request", async () => {
    const GET = wrapRoute(ok, signedIn);
    const res = await GET(req("http://localhost/api/x", { origin: "https://evil.example" }), {});
    expect(res.status).toBe(403);
  });

  it("allows a same-origin request", async () => {
    const GET = wrapRoute(ok, signedIn);
    const res = await GET(req("http://localhost/api/x", { origin: "http://localhost" }), {});
    expect(res.status).toBe(200);
  });

  it("returns 401 when signed out", async () => {
    const GET = wrapRoute(ok, signedOut);
    const res = await GET(req("http://localhost/api/x"), {});
    expect(res.status).toBe(401);
  });

  it("hides an unexpected error behind a generic message", async () => {
    const logError = vi.fn();
    const GET = wrapRoute(async () => { throw new Error("internal detail"); }, { getSession: signedIn.getSession, logError });
    const res = await GET(req("http://localhost/api/x"), {});
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("internal detail");
    expect(logError).toHaveBeenCalledOnce();
  });

  it("compares hosts, not full URLs", () => {
    expect(sameOrigin("http://localhost", "http://localhost/api")).toBe(true);
    expect(sameOrigin("http://localhost:3000", "http://localhost:4000/api")).toBe(false);
    expect(sameOrigin("not a url", "http://localhost")).toBe(false);
  });

  it("builds JSON responses", () => {
    const res = json({ a: 1 }, 201);
    expect(res.status).toBe(201);
    expect(res.headers.get("content-type")).toBe("application/json");
  });
});
