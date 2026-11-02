import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // convex-test runs Convex functions in the same edge-like runtime Convex uses.
    environment: "edge-runtime",
    server: { deps: { inline: ["convex-test"] } },
    include: ["convex/**/*.test.ts", "lib/**/*.test.ts", "n8n/**/*.test.ts"],
  },
});
