import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { searchAdzuna } from "@/lib/sources/adzuna";
import { searchJSearch } from "@/lib/sources/jsearch";
import { searchFreeHire } from "@/lib/sources/freehire";

beforeEach(async () => {
  await prisma.postingSearch.deleteMany({});
});

describe("adzuna adapter", () => {
  it("returns postings from a fake server", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ results: [{ id: 1, title: "Backend Eng", company: { display_name: "Acme" }, location: { display_name: "Bengaluru" }, description: "Go + SQL" }], count: 1 }), { status: 200, headers: { "content-type": "application/json" } }),
    );
    const r = await searchAdzuna("backend", "Bengaluru", "app", "key", fetchImpl as any, "https://fake-adzuna");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.postings).toHaveLength(1);
      expect((r.data.postings[0] as any).title).toBe("Backend Eng");
    }
  });

  it("returns quota error on 429", async () => {
    const fetchImpl = vi.fn(async () => new Response("rate limited", { status: 429 }));
    const r = await searchAdzuna("backend", "Bengaluru", "app", "key", fetchImpl as any, "https://fake-adzuna");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.quota).toBe(true);
  });

  it("caches results", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ results: [{ id: 1, title: "Backend Eng", company: { display_name: "Acme" } }], count: 1 }), { status: 200, headers: { "content-type": "application/json" } }),
    );
    await searchAdzuna("backend", "Bengaluru", "app", "key", fetchImpl as any, "https://fake-adzuna");
    await searchAdzuna("backend", "Bengaluru", "app", "key", fetchImpl as any, "https://fake-adzuna");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});

describe("jsearch adapter", () => {
  it("returns postings from a fake server", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ data: [{ job_id: "j1", job_title: "Backend Eng", employer_name: "Acme", job_description: "Go" }], total: 1 }), { status: 200, headers: { "content-type": "application/json" } }),
    );
    const r = await searchJSearch("backend", "Bengaluru", "key", fetchImpl as any, "https://fake-jsearch");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.postings).toHaveLength(1);
  });
});

describe("freehire adapter", () => {
  it("returns postings from a fake server", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ jobs: [{ id: "f1", title: "Backend Eng", company: "Acme", description: "Go" }], total: 1 }), { status: 200, headers: { "content-type": "application/json" } }),
    );
    const r = await searchFreeHire("backend", "Bengaluru", "key", fetchImpl as any, "https://fake-freehire");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.postings).toHaveLength(1);
  });
});