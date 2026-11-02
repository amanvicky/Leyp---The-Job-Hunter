import { describe, expect, it } from "vitest";
import { checkFactGuard } from "./writing-schemas";

describe("fact guard", () => {
  it("passes when every skill is in the profile", () => {
    const result = checkFactGuard(["Python", "SQL"], ["python", "sql", "react"]);
    expect(result.ok).toBe(true);
    expect(result.unknownSkills).toEqual([]);
  });

  it("flags skills not present in the profile", () => {
    const result = checkFactGuard(["Python", "Kubernetes"], ["python"]);
    expect(result.ok).toBe(false);
    expect(result.unknownSkills).toEqual(["Kubernetes"]);
  });

  it("is case-insensitive", () => {
    const result = checkFactGuard(["PYTHON"], ["python"]);
    expect(result.ok).toBe(true);
  });

  it("flags all unknown skills", () => {
    const result = checkFactGuard(["X", "Y"], ["z"]);
    expect(result.ok).toBe(false);
    expect(result.unknownSkills).toHaveLength(2);
  });
});
