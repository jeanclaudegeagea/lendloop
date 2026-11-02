import type { NextConfig } from "next";

// Cache Components is intentionally left off: every page reads live data
// through Convex client subscriptions, so there is nothing for the server
// cache to hold, and leaving it on would force Suspense boundaries around
// Clerk's session reads for no benefit.
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
