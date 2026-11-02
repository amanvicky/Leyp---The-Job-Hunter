import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "node",
    // Component tests opt into jsdom with a per-file docblock:
    //   // @vitest-environment jsdom
    setupFiles: ["./test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}", "test/**/*.test.ts"],
  },
  resolve: { alias: { "@": resolve(__dirname, "./src") } },
});
