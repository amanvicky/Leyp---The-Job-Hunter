import { describe, expect, it } from "vitest";
import { basicsScore, computeStrength, educationScore, experienceScore, skillsScore } from "./strength";

describe("profile strength", () => {
  it("scores a complete profile as strong", () => {
    const result = computeStrength({ basics: 100, skills: 100, experience: 100, education: 100 });
    expect(result.score).toBe(100);
    expect(result.label).toBe("Strong");
  });

  it("weights experience highest", () => {
    const withExp = computeStrength({ basics: 0, skills: 0, experience: 100, education: 0 });
    const withEdu = computeStrength({ basics: 0, skills: 0, experience: 0, education: 100 });
    expect(withExp.score).toBeGreaterThan(withEdu.score);
  });

  it("labels an empty profile as getting started", () => {
    expect(computeStrength({ basics: 0, skills: 0, experience: 0, education: 0 }).label).toBe("Getting started");
  });

  it("scores basics by completeness", () => {
    expect(basicsScore({ name: "A", email: "a@b.com" })).toBe(60);
    expect(basicsScore({ name: "A", email: "a@b.com", headline: "H", summary: "S" })).toBe(100);
  });

  it("scores skills by count", () => {
    expect(skillsScore(0)).toBe(0);
    expect(skillsScore(1)).toBe(30);
    expect(skillsScore(5)).toBe(60);
    expect(skillsScore(10)).toBe(85);
    expect(skillsScore(20)).toBe(100);
  });

  it("scores experience with bullets higher", () => {
    expect(experienceScore(1, false)).toBe(20);
    expect(experienceScore(1, true)).toBe(60);
    expect(experienceScore(3, true)).toBe(100);
  });

  it("scores education by count", () => {
    expect(educationScore(0)).toBe(0);
    expect(educationScore(1)).toBe(50);
    expect(educationScore(3)).toBe(100);
  });
});
