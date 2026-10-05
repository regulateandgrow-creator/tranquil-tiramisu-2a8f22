import { defineConfig } from "vitest/config";
import path from "node:path";

/** Narrow live checks that spend a few cents. Never part of `npm test`. */
export default defineConfig({
  test: { include: ["tests/live/**/*.test.ts"], environment: "node", testTimeout: 5 * 60 * 1000 },
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
});
