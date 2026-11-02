import { describe, expect, it, vi } from "vitest";
import { extractPosting, EXTRACT_POSTING_VERSION, TaskShapeError } from "./extract-posting";
import type { Provider } from "../types";

function providerAnswering(answer: string): Provider {
  return { name: "fake", chat: vi.fn(async () => answer) };
}

const VALID = JSON.stringify({
  title: "Backend Engineer",
  company: "Acme",
  location: "Hyderabad",
  salary: "₹8–12 LPA",
  requirements: ["Python", "SQL"],
});

describe("extractPosting", () => {
  it("returns the parsed posting", async () => {
    const result = await extractPosting(providerAnswering(VALID), "We need a backend engineer in Hyderabad.");
    expect(result.company).toBe("Acme");
    expect(result.requirements).toContain("SQL");
    expect(result.salary).toBe("₹8–12 LPA");
  });

  it("exposes a version string for provenance", () => {
    expect(EXTRACT_POSTING_VERSION).toBe("extract-posting@1");
  });

  it("unwraps a markdown-fenced answer", async () => {
    const fenced = "```json\n" + VALID + "\n```";
    const result = await extractPosting(providerAnswering(fenced), "text");
    expect(result.title).toBe("Backend Engineer");
  });

  it("rejects output that misses the schema", async () => {
    const bad = providerAnswering(JSON.stringify({ title: 42 }));
    await expect(extractPosting(bad, "text")).rejects.toBeInstanceOf(TaskShapeError);
    await expect(extractPosting(bad, "text")).rejects.toThrow(/expected shape/);
  });

  it("rejects an answer that is not JSON at all", async () => {
    await expect(extractPosting(providerAnswering("I could not read that."), "text"))
      .rejects.toThrow(/was not JSON/);
  });

  it("does not put the posting in the error message", async () => {
    const bad = providerAnswering(JSON.stringify({ title: 42 }));
    await expect(extractPosting(bad, "CONFIDENTIAL POSTING TEXT")).rejects.toSatisfy(
      (error: Error) => !error.message.includes("CONFIDENTIAL"),
    );
  });

  it("passes the posting URL in the prompt when given", async () => {
    const provider = providerAnswering(VALID);
    await extractPosting(provider, "text", "https://example.com/job/1");
    const call = (provider.chat as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as { user: string };
    expect(call.user).toContain("https://example.com/job/1");
  });
});
