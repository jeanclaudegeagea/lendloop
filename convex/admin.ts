import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { requireAdmin } from "./lib/auth";
import { fail } from "./lib/errors";
import { roleValidator } from "./lib/validators";
import { toLoanView } from "./loans";
import { deactivateTool, getActiveTool } from "./tools";

const MAX_LIST = 200;

/** Every public function here starts with requireAdmin, which checks the role on the server. */

/** Moderation: an admin can remove any listing, even one that's on loan. */
export const removeTool = mutation({
  args: { toolId: v.id("tools") },
  handler: async (ctx, { toolId }) => {
    await requireAdmin(ctx);
    const tool = await getActiveTool(ctx, toolId);
    await deactivateTool(ctx, tool);
  },
});

export const listAllLoans = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const loans = await ctx.db.query("loans").order("desc").take(MAX_LIST);
    return await Promise.all(loans.map((loan) => toLoanView(ctx, loan, "both")));
  },
});

/** Users with their listing counts, for the Trusted Lender toggle. */
export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const users = await ctx.db.query("users").order("desc").take(MAX_LIST);
    return await Promise.all(
      users.map(async (u) => {
        const tools = await ctx.db
          .query("tools")
          .withIndex("by_owner_active", (q) =>
            q.eq("ownerId", u._id).eq("isActive", true),
          )
          .collect();
        return {
          _id: u._id,
          name: u.name,
          email: u.email,
          role: u.role,
          isTrustedLender: u.isTrustedLender,
          activeListings: tools.length,
        };
      }),
    );
  },
});

export const setTrustedLender = mutation({
  args: { userId: v.id("users"), isTrustedLender: v.boolean() },
  handler: async (ctx, { userId, isTrustedLender }) => {
    await requireAdmin(ctx);
    const target = await ctx.db.get(userId);
    if (!target) fail("NOT_FOUND", "That user doesn't exist.");
    await ctx.db.patch(target._id, { isTrustedLender });
  },
});

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
