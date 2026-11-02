import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { assertToolOwner, requireUser } from "./lib/auth";
import { todayUTC } from "./lib/dates";
import { fail } from "./lib/errors";
import { enqueueLoanNotification } from "./lib/outbox";
import { cleanToolInput } from "./lib/toolInput";
import { categoryValidator, conditionValidator } from "./lib/validators";

const MAX_LIST = 200;

const toolFields = {
  name: v.string(),
  category: categoryValidator,
  condition: conditionValidator,
  description: v.string(),
};

/**
 * Public landing-page list. No auth required, so it returns ONLY the tool id,
 * name and category. The `returns` validator makes that a hard contract:
 * if someone later adds an owner field here, Convex rejects the response
 * instead of leaking it.
 */
export const listPublic = query({
  args: {},
  returns: v.array(
    v.object({ _id: v.id("tools"), name: v.string(), category: categoryValidator }),
  ),
  handler: async (ctx) => {
    const tools = await ctx.db
      .query("tools")
      .withIndex("by_active_category", (q) => q.eq("isActive", true))
      .order("desc")
      .take(MAX_LIST);
    return tools.map((t) => ({ _id: t._id, name: t.name, category: t.category }));
  },
});

/** All active tools with availability, for signed-in users. Never includes owner emails. */
export const listAll = query({
  args: { category: v.optional(categoryValidator) },
  handler: async (ctx, { category }) => {
    const user = await requireUser(ctx);
    const tools = await ctx.db
      .query("tools")
      .withIndex("by_active_category", (q) =>
        category
          ? q.eq("isActive", true).eq("category", category)
          : q.eq("isActive", true),
      )
      .order("desc")
      .take(MAX_LIST);

    const today = todayUTC();
    return await Promise.all(
      tools.map(async (tool) => {
        const owner = await ctx.db.get(tool.ownerId);
        return {
          ...publicToolFields(tool),
          isMine: tool.ownerId === user._id,
          owner: {
            name: owner?.name ?? "Unknown",
            isTrustedLender: owner?.isTrustedLender ?? false,
          },
          ...(await availability(ctx, tool._id, today)),
        };
      }),
    );
  },
});

/** The caller's own active listings, with open request counts. */
export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const tools = await ctx.db
      .query("tools")
      .withIndex("by_owner_active", (q) => q.eq("ownerId", user._id).eq("isActive", true))
      .order("desc")
      .take(MAX_LIST);

    const today = todayUTC();
    return await Promise.all(
      tools.map(async (tool) => {
        const pending = await ctx.db
          .query("loans")
          .withIndex("by_tool_status", (q) =>
            q.eq("toolId", tool._id).eq("status", "requested"),
          )
          .collect();
        return {
          ...publicToolFields(tool),
          pendingRequests: pending.length,
          ...(await availability(ctx, tool._id, today)),
        };
      }),
    );
  },
});

export const create = mutation({
  args: toolFields,
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const input = cleanToolInput(args);
    return await ctx.db.insert("tools", { ...input, ownerId: user._id, isActive: true });
  },
});

export const update = mutation({
  args: { toolId: v.id("tools"), ...toolFields },
  handler: async (ctx, { toolId, ...args }) => {
    const user = await requireUser(ctx);
    const tool = await getActiveTool(ctx, toolId);
    assertToolOwner(user, tool);
    await ctx.db.patch(tool._id, cleanToolInput(args));
  },
});

/** Owners can delete a listing unless it's currently lent out. */
export const remove = mutation({
  args: { toolId: v.id("tools") },
  handler: async (ctx, { toolId }) => {
    const user = await requireUser(ctx);
    const tool = await getActiveTool(ctx, toolId);
    assertToolOwner(user, tool);

    const activeLoan = await ctx.db
      .query("loans")
      .withIndex("by_tool_status", (q) =>
        q.eq("toolId", tool._id).eq("status", "approved"),
      )
      .first();
    if (activeLoan) {
      fail(
        "CONFLICT",
        "This tool has an approved loan. Mark it returned before deleting.",
      );
    }
    await deactivateTool(ctx, tool);
  },
});

// ---------------------------------------------------------------------------
// Helpers shared with admin.ts
// ---------------------------------------------------------------------------

export async function getActiveTool(
  ctx: Pick<QueryCtx, "db">,
  toolId: Id<"tools">,
): Promise<Doc<"tools">> {
  const tool = await ctx.db.get(toolId);
  if (!tool || !tool.isActive)
    fail("NOT_FOUND", "That tool doesn't exist or was removed.");
  return tool;
}

/**
 * Soft-deletes a tool and declines its open requests (notifying each
 * borrower). Approved loans are left as they are so the lender can still
 * mark them returned.
 */
export async function deactivateTool(
  ctx: MutationCtx,
  tool: Doc<"tools">,
): Promise<void> {
  await ctx.db.patch(tool._id, { isActive: false });
  const pending = await ctx.db
    .query("loans")
    .withIndex("by_tool_status", (q) =>
      q.eq("toolId", tool._id).eq("status", "requested"),
    )
    .collect();
  for (const loan of pending) {
    await ctx.db.patch(loan._id, { status: "declined", decidedAt: Date.now() });
    await enqueueLoanNotification(ctx, loan._id, "loan_declined");
  }
}

function publicToolFields(tool: Doc<"tools">) {
  return {
    _id: tool._id,
    _creationTime: tool._creationTime,
    name: tool.name,
    category: tool.category,
    condition: tool.condition,
    description: tool.description,
  };
}

/**
 * "on_loan" if an approved loan covers today or is overdue. Otherwise
 * "available", plus upcoming booked ranges (dates only) so borrowers can
 * pick free dates.
 */
async function availability(
  ctx: Pick<QueryCtx, "db">,
  toolId: Id<"tools">,
  today: string,
) {
  const approved = await ctx.db
    .query("loans")
    .withIndex("by_tool_status", (q) => q.eq("toolId", toolId).eq("status", "approved"))
    .collect();
  const onLoan = approved.some((loan) => loan.startDate <= today);
  const bookedRanges = approved
    .map((loan) => ({ startDate: loan.startDate, endDate: loan.endDate }))
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
  return {
    availability: onLoan ? ("on_loan" as const) : ("available" as const),
    bookedRanges,
  };
}
