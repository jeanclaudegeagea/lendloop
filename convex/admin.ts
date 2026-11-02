import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { fail } from "./lib/errors";
import { roleValidator } from "./lib/validators";

/**
 * Promotes or demotes a user. This is an internal mutation, so the browser
 * can't call it; only someone with deploy access can, from the CLI:
 *
 *   npx convex run admin:setRole '{"email":"you@example.com","role":"admin"}'
 */
export const setRole = internalMutation({
  args: { email: v.string(), role: roleValidator },
  handler: async (ctx, { email, role }) => {
    const target = email.trim().toLowerCase();
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", target))
      .first();
    if (!user)
      fail("NOT_FOUND", `No user with email ${target}. They need to sign in once first.`);
    await ctx.db.patch(user._id, { role });
    return { userId: user._id, role };
  },
});
