import { describe, expect, it } from "vitest";
import {
  parseDateToken,
  parseRange,
  parseResume,
  splitLanguage,
  splitSections,
  stripMarker,
} from "@/lib/profile/import";

const RESUME = `Aman Vicky
Backend Engineer
aman@example.com | +91 90000 00000 | Bengaluru, India
linkedin.com/in/amanvicky | github.com/amanvicky

Summary
Ten years building payment systems that stay up under load. Comfortable owning
a service end to end.

Experience
Senior Backend Engineer | Acme Corp | Remote
Apr 2021 - Present
- Rebuilt the ledger service, cutting p99 latency from 900ms to 120ms.
- Led a migration of 40 services to a single identity provider.

Backend Engineer | Startup Labs | Bengaluru
Jun 2018 - Mar 2021
- Built the first version of the billing pipeline.

Education
B.Tech Computer Science | IIT Delhi
2012 - 2016

Skills
Languages: TypeScript, Go, Python
Databases: PostgreSQL, Redis

Languages
English (Native), Hindi (Fluent)

Projects
Leyp - github.com/amanvicky/leyp
- A self-hosted job search tool.
`;

describe("resume import", () => {
  it("strips list markers", () => {
    expect(stripMarker("- one")).toBe("one");
    expect(stripMarker("  • two")).toBe("two");
    expect(stripMarker("plain")).toBe("plain");
  });

  it("parses the date shapes people write", () => {
    expect(parseDateToken("Mar 2021")).toEqual({ year: 2021, month: 3, current: false });
    expect(parseDateToken("March 2021")).toEqual({ year: 2021, month: 3, current: false });
    expect(parseDateToken("2021")).toEqual({ year: 2021, month: null, current: false });
    expect(parseDateToken("03/2021")).toEqual({ year: 2021, month: 3, current: false });
    expect(parseDateToken("2021-03")).toEqual({ year: 2021, month: 3, current: false });
    expect(parseDateToken("Present")).toEqual({ year: null, month: null, current: true });
    expect(parseDateToken("nonsense")).toEqual({ year: null, month: null, current: false });
  });

  it("parses ranges and leaves the surrounding text", () => {
    const range = parseRange("Senior Engineer | Acme | Apr 2021 - Present");
    expect(range?.start).toEqual({ year: 2021, month: 4, current: false });
    expect(range?.end.current).toBe(true);
    expect(range?.rest).toContain("Senior Engineer");

    expect(parseRange("2012 – 2016")?.start.year).toBe(2012);
    expect(parseRange("no dates here")).toBeNull();
  });

  it("splits the document at recognised headings", () => {
    const { preamble, sections } = splitSections(RESUME);
    expect(preamble[0]).toBe("Aman Vicky");
    expect(Object.keys(sections)).toEqual(
      expect.arrayContaining(["summary", "experience", "education", "skills", "languages", "projects"]),
    );
    expect(sections.experience?.[0]).toContain("Senior Backend Engineer");
  });

  it("recognises a language and its level", () => {
    expect(splitLanguage("English (Native)")).toEqual({ name: "English", level: "NATIVE" });
    expect(splitLanguage("Hindi (Fluent)")).toEqual({ name: "Hindi", level: "C1" });
    expect(splitLanguage("German - B1")).toEqual({ name: "German", level: "B1" });
    expect(splitLanguage("Spanish")).toEqual({ name: "Spanish", level: "B2" });
    expect(splitLanguage("   ")).toBeNull();
  });

  it("extracts the contact block", () => {
    const parsed = parseResume(RESUME);
    const fields = Object.fromEntries(parsed.fields.map((field) => [field.key, field.value]));
    expect(fields.name).toBe("Aman Vicky");
    expect(fields.email).toBe("aman@example.com");
    expect(fields.headline).toBe("Backend Engineer");
    expect(fields.linkedin).toContain("linkedin.com/in/amanvicky");
    expect(fields.github).toContain("github.com/amanvicky");
    expect(fields.phone).toBeTruthy();
  });

  it("extracts every role with its dates and bullets", () => {
    const parsed = parseResume(RESUME);
    expect(parsed.experiences).toHaveLength(2);

    const [first, second] = parsed.experiences;
    expect(first?.role).toBe("Senior Backend Engineer");
    expect(first?.company).toBe("Acme Corp");
    expect(first?.location).toBe("Remote");
    expect(first?.startYear).toBe(2021);
    expect(first?.startMonth).toBe(4);
    expect(first?.current).toBe(true);
    expect(first?.bullets).toHaveLength(2);
    expect(first?.bullets[0]).toContain("p99 latency");

    expect(second?.role).toBe("Backend Engineer");
    expect(second?.company).toBe("Startup Labs");
    expect(second?.startYear).toBe(2018);
    expect(second?.endYear).toBe(2021);
    expect(second?.current).toBe(false);
  });

  it("groups skills and drops duplicates", () => {
    const parsed = parseResume(RESUME);
    expect(parsed.skills).toEqual([
      { name: "TypeScript", group: "Languages" },
      { name: "Go", group: "Languages" },
      { name: "Python", group: "Languages" },
      { name: "PostgreSQL", group: "Databases" },
      { name: "Redis", group: "Databases" },
    ]);
  });

  it("extracts education and languages", () => {
    const parsed = parseResume(RESUME);
    expect(parsed.educations[0]).toMatchObject({
      degree: "B.Tech Computer Science",
      school: "IIT Delhi",
      startYear: 2012,
      endYear: 2016,
    });
    expect(parsed.languages).toEqual([
      { name: "English", level: "NATIVE" },
      { name: "Hindi", level: "C1" },
    ]);
  });

  it("extracts the summary as one paragraph", () => {
    const parsed = parseResume(RESUME);
    const summary = parsed.fields.find((field) => field.key === "summary");
    expect(summary?.value).toContain("Ten years building payment systems");
    expect(summary?.value).toContain("owning a service end to end");
  });

  it("says what it could not find instead of inventing data", () => {
    const parsed = parseResume("Just a name\n\nNo sections at all.");
    expect(parsed.experiences).toEqual([]);
    expect(parsed.educations).toEqual([]);
    expect(parsed.skills).toEqual([]);
    expect(parsed.warnings.length).toBe(3);
  });

  it("survives empty and junk input", () => {
    for (const input of ["", "   ", "\n\n\n", "!@#$%^&*()", "1234567890"]) {
      const parsed = parseResume(input);
      expect(parsed.experiences).toEqual([]);
      expect(parsed.skills).toEqual([]);
    }
  });

  it("does not mistake a phone number for the name", () => {
    const parsed = parseResume("+91 90000 00000\naman@example.com\n\nExperience\nEngineer | Acme | 2020 - 2021");
    const name = parsed.fields.find((field) => field.key === "name");
    expect(name?.value ?? "").not.toContain("90000");
  });
});
