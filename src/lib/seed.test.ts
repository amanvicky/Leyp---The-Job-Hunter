import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { BUILT_IN_THEMES, resetAndSeed, seed } from "./seed";

beforeEach(async () => {
  await resetAndSeed();
});

describe("seed", () => {
  it("creates the six built-in themes", async () => {
    const themes = await prisma.theme.findMany({ where: { builtIn: true } });
    expect(themes).toHaveLength(6);
    expect(themes.map((theme) => theme.name).sort()).toEqual([
      "Bold",
      "Classic",
      "Compact",
      "Editorial",
      "Minimal",
      "Modern",
    ]);
  });

  it("covers every layout and every heading style across the built-ins", async () => {
    const themes = await prisma.theme.findMany({ where: { builtIn: true } });
    expect(new Set(themes.map((theme) => theme.layout))).toEqual(
      new Set(["SINGLE", "SIDEBAR_LEFT", "SIDEBAR_RIGHT"]),
    );
    expect(new Set(themes.map((theme) => theme.headingStyle))).toEqual(
      new Set(["PLAIN", "RULE", "SMALL_CAPS", "UPPERCASE"]),
    );
    expect(new Set(themes.map((theme) => theme.density))).toEqual(
      new Set(["COMPACT", "REGULAR", "AIRY"]),
    );
  });

  it("is idempotent", async () => {
    await seed();
    await seed();
    expect(await prisma.theme.count({ where: { builtIn: true } })).toBe(BUILT_IN_THEMES.length);
  });

  it("creates the default settings", async () => {
    const settings = await prisma.setting.findMany();
    expect(settings.length).toBeGreaterThan(0);
    expect(settings.find((row) => row.key === "agent.enabled")?.value).toBe("false");
    expect(settings.find((row) => row.key === "search.country")?.value).toBe("in");
  });

  it("never overwrites a setting the user changed", async () => {
    await prisma.setting.update({ where: { key: "agent.enabled" }, data: { value: "true" } });
    await seed();
    const after = await prisma.setting.findUnique({ where: { key: "agent.enabled" } });
    expect(after?.value).toBe("true");
  });

  it("gives every theme a complete set of layout fields", async () => {
    const themes = await prisma.theme.findMany({ where: { builtIn: true } });
    for (const theme of themes) {
      for (const field of ["headFont", "bodyFont", "accent", "layout", "align", "headingStyle"] as const) {
        expect(theme[field], `${theme.name}.${field}`).toBeTruthy();
      }
    }
  });

  it("wipes user data on reset", async () => {
    await prisma.application.create({ data: { title: "Gone", company: "C" } });
    await prisma.skill.create({ data: { name: "python" } });
    await resetAndSeed();
    expect(await prisma.application.count()).toBe(0);
    expect(await prisma.skill.count()).toBe(0);
    // ...and leaves the seed in place.
    expect(await prisma.theme.count({ where: { builtIn: true } })).toBe(BUILT_IN_THEMES.length);
  });
});
