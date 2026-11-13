import type { AuthConfig } from "convex/server";

// Trusts JWTs from Clerk's "convex" template. CLERK_JWT_ISSUER_DOMAIN is its Issuer.
export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN!,
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;
