import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, sep } from "node:path";

/**
 * The audit that makes the wrappers real.
 *
 * Every page, Server Action and route handler must check the session. Without
 * this test the contracts are a convention; with it, a new route that forgets
 * auth fails CI.
 */
const APP_DIR = "src/app";

/** The only files allowed to run without a session, and why. */
const EXEMPT: Record<string, string> = {
  [`src${sep}app${sep}login${sep}actions.ts`]: "the sign-in action itself",
  [`src${sep}app${sep}logout${sep}route.ts`]: "signing out must work while signed in",
};

/**
 * Layouts that verify the session gate everything beneath them, so pages in a
 * gated subtree need no check of their own. The root layout is not a gate: it
 * wraps the sign-in screen too.
 */
const GATED_ROOTS = [join("src", "app", "(app)")];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

function classify(source: string, file: string): { isPage: boolean; isAction: boolean; isHandler: boolean } {
  // Layouts are audited by name against GATED_ROOTS instead: the root layout
  // must stay reachable while signed out, since it also wraps the sign-in form.
  const isLayout = /layout\.tsx$/.test(file);
  const isPage =
    !isLayout &&
    (/export\s+default\s+(async\s+)?function/.test(source) || /export\s+default\s+/.test(source));
  return {
    isPage,
    isAction: /["']use server["']/.test(source) && /export\s+(async\s+)?function\s+\w+/.test(source),
    isHandler:
      /export\s+(async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE)\b/.test(source) ||
      /export\s+const\s+(GET|POST|PUT|PATCH|DELETE)\s*=/.test(source),
  };
}

function isGuarded(source: string): boolean {
  return (
    /\bverifySession\s*\(/.test(source) ||
    /\bgetSession\s*\(/.test(source) ||
    /\broute\s*[<(]/.test(source) ||
    /\bserverAction\s*[<(]/.test(source) ||
    /from\s+["']@\/lib\/(route|action)["']/.test(source)
  );
}

describe("session audit", () => {
  it("finds the app tree", () => {
    expect(() => statSync(APP_DIR)).not.toThrow();
  });

  it("audits a meaningful number of files", () => {
    const files = walk(APP_DIR).filter((file) => /\.(ts|tsx)$/.test(file) && !file.includes(".test."));
    // A silent zero-file walk would make this whole test vacuous.
    expect(files.length).toBeGreaterThanOrEqual(5);
  });

  it("every page, action and route handler checks the session", () => {
    const offenders: string[] = [];

    for (const file of walk(APP_DIR)) {
      if (!/\.(ts|tsx)$/.test(file) || file.includes(".test.")) continue;
      if (EXEMPT[file]) continue;

      const source = readFileSync(file, "utf8");
      const kind = classify(source, file);
      if (!kind.isPage && !kind.isAction && !kind.isHandler) continue;

      // A page inside a layout that gates the subtree is already protected.
      const inGatedSubtree =
        kind.isPage && GATED_ROOTS.some((root) => file.startsWith(root + sep) && !file.endsWith(`layout.tsx`));
      if (inGatedSubtree) continue;

      if (isGuarded(source)) continue;

      offenders.push(file);
    }

    expect(offenders).toEqual([]);
  });

  it("each gated subtree really does gate", () => {
    for (const root of GATED_ROOTS) {
      const layout = readFileSync(join(root, "layout.tsx"), "utf8");
      expect(layout, `${root} must call verifySession()`).toMatch(/await\s+verifySession\(\)/);
    }
  });

  it("every exemption still exists, so none can rot", () => {
    for (const file of Object.keys(EXEMPT)) {
      expect(() => statSync(file)).not.toThrow();
    }
  });

  it("a layout gates the whole (app) subtree", () => {
    const layout = readFileSync(join(APP_DIR, "(app)", "layout.tsx"), "utf8");
    expect(layout).toMatch(/await\s+verifySession\(\)/);
  });
});
