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
    const path = resolve(root, "prisma", file);
    if (existsSync(path)) rmSync(path);
    const rootPath = resolve(root, file);
    if (existsSync(rootPath)) rmSync(rootPath);
  }

  execFileSync("npx", ["prisma", "migrate", "deploy"], {
    cwd: root,
    env: { ...process.env, DATABASE_URL: "file:./test.db" },
    stdio: "pipe",
    shell: true,
  });
}
