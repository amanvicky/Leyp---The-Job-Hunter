import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}", "test/**/*.test.ts"],
    setupFiles: ["./test/setup.ts"],
    /**
     * Tests must never touch the development database: a test that trips the
     * sign-in throttle would lock the real user out. The global setup swaps in
     * a throwaway file before any test module loads.
     */
    globalSetup: ["./test/global-setup.ts"],
    fileParallelism: false,
    env: { DATABASE_URL: "file:./test.db" },
  },
});
