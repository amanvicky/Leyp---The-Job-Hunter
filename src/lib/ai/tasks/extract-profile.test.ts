import { describe, expect, it, vi } from "vitest";
import { extractProfile, EXTRACT_PROFILE_VERSION, ProfileShapeError } from "./extract-profile";

describe("extractProfile", () => {
  it("exposes a version string", () => {
    expect(EXTRACT_PROFILE_VERSION).toBe("extract-profile@1");
  });

  it("parses a valid profile", async () => {
    const answer = JSON.stringify({
      name: "Aman Vicky",
      email: "aman@example.com",
      skills: ["Python", "SQL"],
      experiences: [{ role: "Backend Engineer", company: "Acme", bullets: ["Built API"] }],
      education: [{ degree: "B.Tech", school: "IIT" }],
    });
    const provider = { chat: vi.fn(async () => answer) };
    const result = await extractProfile(provider, "Aman Vicky\naman@example.com\nBackend Engineer at Acme");
    expect(result.name).toBe("Aman Vicky");
    expect(result.skills).toContain("Python");
    expect(result.experiences).toHaveLength(1);
  });

  it("unwraps markdown fences", async () => {
    const answer = "```json\n" + JSON.stringify({ name: "Test" }) + "\n```";
    const provider = { chat: vi.fn(async () => answer) };
    const result = await extractProfile(provider, "resume text");
    expect(result.name).toBe("Test");
  });

  it("rejects non-JSON answers", async () => {
    const provider = { chat: vi.fn(async () => "I could not parse this.") };
    await expect(extractProfile(provider, "resume text")).rejects.toBeInstanceOf(ProfileShapeError);
  });

  it("rejects answers missing required shape", async () => {
    const provider = { chat: vi.fn(async () => JSON.stringify({ skills: "not an array" })) };
    await expect(extractProfile(provider, "resume text")).rejects.toBeInstanceOf(ProfileShapeError);
  });
});
