import type { AuthConfig } from "convex/server";

// Convex trusts JWTs issued by this Clerk instance, with audience "convex".
// Set CLERK_JWT_ISSUER_DOMAIN in the Convex dashboard (or `npx convex env set`).
// The value is the "Issuer" shown on Clerk's "convex" JWT template.
export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN!,
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;
