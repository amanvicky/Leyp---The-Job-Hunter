import { describe, expect, it, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { detachSkillFromExperience, normaliseSkillName, skillLabel, upsertSkill, removeSkill, attachSkillToExperience, listSkills } from "./skills";
import { createExperience, listExperiences, reorderExperiences } from "./experiences";
import { createProject, listProjects } from "./projects";
import { createEducation, listEducations } from "./entities";
import { upsertProfileField, getProfileFields } from "./entities";

describe("profile", () => {
  beforeEach(async () => {
    await (await import("@/lib/prisma")).prisma.experience.deleteMany({});
    await (await import("@/lib/prisma")).prisma.project.deleteMany({});
    await (await import("@/lib/prisma")).prisma.skill.deleteMany({});
    await (await import("@/lib/prisma")).prisma.experienceSkill.deleteMany({});
    await (await import("@/lib/prisma")).prisma.projectSkill.deleteMany({});
  });
  describe("skills", () => {
    it("normalises casing and whitespace", () => {
      expect(normaliseSkillName("  Figma ")).toBe("figma");
      expect(normaliseSkillName("Python")).toBe("python");
    });

    it("deduplicates skills by normalised name", async () => {
      const first = await upsertSkill("Python");
      const second = await upsertSkill("  python  ");
      expect(second.id).toBe(first.id);
      expect(await prisma.skill.count()).toBe(1);
    });

    it("keeps the spelling the user typed as the label", async () => {
      const skill = await upsertSkill("TypeScript");
      expect(skill.name).toBe("typescript");
      expect(skill.label).toBe("TypeScript");
      expect(skillLabel(skill)).toBe("TypeScript");
    });

    it("never lets a later spelling downgrade the first one", async () => {
      await upsertSkill("TypeScript");
      const again = await upsertSkill("  typescript ");
      expect(again.label).toBe("TypeScript");
      expect(await prisma.skill.count()).toBe(1);
    });

    it("prints the stored name when a row has no label", () => {
      expect(skillLabel({ name: "go" })).toBe("go");
      expect(skillLabel({ name: "go", label: "  " })).toBe("go");
    });

    it("links skills to an experience", async () => {
      const skill = await upsertSkill("sql");
      const experience = await createExperience({ role: "Backend", company: "Acme", skillIds: [skill.id] });
      const listed = await listExperiences();
      expect(listed[0]?.skills.map((link) => link.skill.name)).toEqual(["sql"]);
      await detachSkillFromExperience(experience.id, skill.id);
      expect((await listExperiences())[0]?.skills).toHaveLength(0);
    });
  });

  describe("experiences", () => {
    it("creates and lists in sort order", async () => {
      await createExperience({ role: "First", company: "A" });
      await createExperience({ role: "Second", company: "B" });
      const list = await listExperiences();
      expect(list.map((item) => item.role)).toEqual(["First", "Second"]);
    });

    it("reorders by id", async () => {
      const first = await createExperience({ role: "First", company: "A" });
      const second = await createExperience({ role: "Second", company: "B" });
      await reorderExperiences([second.id, first.id]);
      const list = await listExperiences();
      expect(list.map((item) => item.role)).toEqual(["Second", "First"]);
    });

    it("deletes an experience", async () => {
      const experience = await createExperience({ role: "Temp", company: "X" });
      await (await import("./experiences")).deleteExperience(experience.id);
      expect(await listExperiences()).toHaveLength(0);
    });
  });

  describe("projects", () => {
    it("creates a project with skills", async () => {
      const skill = await upsertSkill("rust");
      const project = await createProject({ name: "Leyp", skillIds: [skill.id] });
      const listed = await listProjects();
      expect(listed[0]?.name).toBe("Leyp");
      expect(listed[0]?.skills.map((link) => link.skill.name)).toEqual(["rust"]);
    });
  });

  describe("education", () => {
    it("stores an education entry", async () => {
      await createEducation({ degree: "B.Tech", school: "IIT" });
      const list = await listEducations();
      expect(list[0]?.degree).toBe("B.Tech");
    });
  });

  describe("profile fields", () => {
    it("stores and retrieves profile fields", async () => {
      await upsertProfileField("name", "Aman");
      await upsertProfileField("headline", "Backend Engineer");
      const fields = await getProfileFields();
      expect(fields.name).toBe("Aman");
      expect(fields.headline).toBe("Backend Engineer");
    });

    it("overwrites an existing field", async () => {
      await upsertProfileField("name", "Old");
      await upsertProfileField("name", "New");
      const fields = await getProfileFields();
      expect(fields.name).toBe("New");
    });
  });
});
