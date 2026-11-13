import { mutation, query } from "./_generated/server";
import { getCurrentUser, parseAdminEmails } from "./lib/auth";
import { fail } from "./lib/errors";

/**
 * Creates the user row on first sign-in, then keeps name and email in sync.
 * Admin only if the email is in ADMIN_EMAILS and verified, and only at creation.
 */
export const ensureCurrentUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) fail("UNAUTHENTICATED", "You need to sign in.");

    const email = (identity.email ?? "").toLowerCase();
    // Other users see this name, so it's never derived from the email.
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
