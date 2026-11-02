import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { action, ActionError, GENERIC_ERROR, SIGNED_OUT, isNextControlFlow } from "./action-core";

const signedIn = { getSession: async () => ({ fingerprint: "fp" }), logError: vi.fn() };
const signedOut = { getSession: async () => null, logError: vi.fn() };

describe("action", () => {
  it("returns data on success", async () => {
    const run = action(z.object({ n: z.number() }), async ({ n }) => n * 2, signedIn);
    await expect(run({ n: 21 })).resolves.toEqual({ ok: true, data: 42 });
  });

  it("refuses to run when signed out", async () => {
    const handler = vi.fn();
    const run = action(z.object({}), handler, signedOut);
    await expect(run({})).resolves.toEqual({ ok: false, error: SIGNED_OUT });
    expect(handler).not.toHaveBeenCalled();
  });

  it("returns field errors on invalid input", async () => {
    const run = action(
      z.object({ name: z.string().min(1, "Give it a name.") }),
      async () => 1,
      signedIn,
    );
    const result = await run({ name: "" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors?.name).toContain("Give it a name.");
      expect(result.error).toBe("Please fix the highlighted fields.");
    }
  });

  it("shows ActionError messages to the user", async () => {
    const run = action(z.object({}), async () => { throw new ActionError("That job is gone."); }, signedIn);
    await expect(run({})).resolves.toEqual({ ok: false, error: "That job is gone." });
  });

  it("hides unexpected error details", async () => {
    const logError = vi.fn();
    const run = action(
      z.object({}),
      async () => { throw new Error("connection string postgres://secret"); },
      { getSession: signedIn.getSession, logError },
    );
    const result = await run({});
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe(GENERIC_ERROR);
      expect(result.error).not.toContain("secret");
    }
    expect(logError).toHaveBeenCalledOnce();
  });

  it("lets redirect() escape instead of turning it into an error", async () => {
    const redirect = Object.assign(new Error("NEXT_REDIRECT"), { digest: "NEXT_REDIRECT;replace;/login" });
    const run = action(z.object({}), async () => { throw redirect; }, signedIn);
    await expect(run({})).rejects.toThrow(/NEXT_REDIRECT/);
  });

  it("lets notFound() escape too", async () => {
    const notFound = Object.assign(new Error("NEXT_NOT_FOUND"), { digest: "NEXT_NOT_FOUND" });
    const run = action(z.object({}), async () => { throw notFound; }, signedIn);
    await expect(run({})).rejects.toThrow(/NEXT_NOT_FOUND/);
  });

  it("returns a toast when the handler asks for one", async () => {
    const run = action(z.object({}), async (_input, { toast }) => { toast("Saved."); return 1; }, signedIn);
    await expect(run({})).resolves.toEqual({ ok: true, data: 1, toast: "Saved." });
  });

  it("recognises Next control-flow errors by digest", () => {
    expect(isNextControlFlow({ digest: "NEXT_REDIRECT;push;/x" })).toBe(true);
    expect(isNextControlFlow({ digest: "NEXT_NOT_FOUND" })).toBe(true);
    expect(isNextControlFlow(new Error("plain"))).toBe(false);
    expect(isNextControlFlow(null)).toBe(false);
  });
});
