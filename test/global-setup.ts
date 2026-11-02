import { execFileSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Runs once before the whole suite.
 *
 * The tests get their own database file, created fresh from the migrations, so
 * they can never corrupt what the app is using. `file:./test.db` is relative to
 * the schema directory, which is where Prisma puts it.
 */
export async function setup(): Promise<void> {
  const root = resolve(import.meta.dirname, "..");

  for (const file of ["test.db", "test.db-journal", "test.db-wal", "test.db-shm"]) {
    for (const dir of [resolve(root, "prisma"), root]) {
      const path = resolve(dir, file);
      if (existsSync(path)) rmSync(path);
    }
  }

  // Resolve the CLI's entry script rather than going through npx: spawning a
  // shell to find it would concatenate unescaped arguments.
  const cli = resolve(root, "node_modules", "prisma", "build", "index.js");
  execFileSync(process.execPath, [cli, "migrate", "deploy"], {
    cwd: root,
    env: { ...process.env, DATABASE_URL: "file:./test.db" },
    stdio: "pipe",
  });
}
