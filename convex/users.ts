import { mutation, query } from "./_generated/server";
import { getCurrentUser, parseAdminEmails } from "./lib/auth";
import { fail } from "./lib/errors";

/**
 * Creates the caller's user row on first sign-in, and keeps name and email in
 * sync with Clerk after that. The client calls it once after Clerk signs in.
 *
 * Admin bootstrap: a new user is an admin only if their email is in the Convex
 * env var ADMIN_EMAILS and Clerk says it's verified. For an existing row the
 * role is never touched, so editing ADMIN_EMAILS can't silently promote
 * anyone. Later role changes go through the internal `admin:setRole`.
 */
export const ensureCurrentUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) fail("UNAUTHENTICATED", "You need to sign in.");

    const email = (identity.email ?? "").toLowerCase();
    // Display names are shown to other users, so never derive one from the
    // email address: fall back to the Clerk username, then "Neighbor".
    const name = identity.name?.trim() || identity.nickname?.trim() || "Neighbor";

    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (existing) {
      if (existing.name !== name || existing.email !== email) {
        await ctx.db.patch(existing._id, { name, email });
      }
      return existing._id;
    }

    const isAdmin =
      identity.emailVerified === true &&
      parseAdminEmails(process.env.ADMIN_EMAILS).has(email);

    return await ctx.db.insert("users", {
      clerkId: identity.subject,
      name,
      email,
      role: isAdmin ? "admin" : "user",
      isTrustedLender: false,
    });
  },
});

/** The caller's own profile, or null if signed out or not provisioned yet. */
export const me = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    return {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isTrustedLender: user.isTrustedLender,
    };
  },
});
