import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: { include: ["tests/acceptance/**/*.test.ts"], environment: "node", testTimeout: 15 * 60 * 1000, hookTimeout: 60_000 },
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
});
