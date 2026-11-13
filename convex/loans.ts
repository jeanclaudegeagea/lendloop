import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type QueryCtx } from "./_generated/server";
import { assertLoanParticipant, requireUser } from "./lib/auth";
import { rangesOverlap, todayUTC } from "./lib/dates";
import { fail } from "./lib/errors";
import { assertTransition, deriveStatus, validateLoanDates } from "./lib/loanStatus";
import { enqueueLoanNotification } from "./lib/outbox";
import { getActiveTool } from "./tools";

const MAX_LIST = 200;
const ACTIVITY_PER_LOAN = 5;

export const request = mutation({
  args: { toolId: v.id("tools"), startDate: v.string(), endDate: v.string() },
  handler: async (ctx, { toolId, startDate, endDate }) => {
    const user = await requireUser(ctx);
    const tool = await getActiveTool(ctx, toolId);
    if (tool.ownerId === user._id) fail("FORBIDDEN", "You can't borrow your own tool.");

    validateLoanDates(startDate, endDate, todayUTC());
    const range = { startDate, endDate };

    const approved = await loansForTool(ctx, toolId, "approved");
    if (approved.some((loan) => rangesOverlap(loan, range))) {
      fail("CONFLICT", "The tool is already booked for some of those dates.");
    }
    // Stops the same borrower from stacking duplicate requests.
    const pending = await loansForTool(ctx, toolId, "requested");
    if (
      pending.some((loan) => loan.borrowerId === user._id && rangesOverlap(loan, range))
    ) {
      fail("CONFLICT", "You already have a pending request for these dates.");
    }

    const loanId = await ctx.db.insert("loans", {
      toolId,
      borrowerId: user._id,
      lenderId: tool.ownerId,
      startDate,
      endDate,
      status: "requested",
    });
    await enqueueLoanNotification(ctx, loanId, "loan_requested");
    return loanId;
  },
});

/** Overlap is re-checked here; overlapping pending requests are auto-declined. */
export const approve = mutation({
  args: { loanId: v.id("loans") },
  handler: async (ctx, { loanId }) => {
    const user = await requireUser(ctx);
    const loan = await getLoan(ctx, loanId);
    assertLoanParticipant(user, loan, "lender");
    assertTransition(loan.status, "approved");
    if (loan.endDate < todayUTC()) {
      fail("CONFLICT", "This request's dates have already passed. Decline it instead.");
    }

    const approved = await loansForTool(ctx, loan.toolId, "approved");
    if (approved.some((other) => rangesOverlap(other, loan))) {
      fail("CONFLICT", "You've already approved another loan for overlapping dates.");
    }

    const now = Date.now();
    await ctx.db.patch(loan._id, { status: "approved", decidedAt: now });
    await enqueueLoanNotification(ctx, loan._id, "loan_approved");

    const pending = await loansForTool(ctx, loan.toolId, "requested");
    for (const other of pending) {
      if (other._id !== loan._id && rangesOverlap(other, loan)) {
        await ctx.db.patch(other._id, { status: "declined", decidedAt: now });
        await enqueueLoanNotification(ctx, other._id, "loan_declined");
      }
    }
  },
});

export const decline = mutation({
  args: { loanId: v.id("loans") },
  handler: async (ctx, { loanId }) => {
    const user = await requireUser(ctx);
    const loan = await getLoan(ctx, loanId);
    assertLoanParticipant(user, loan, "lender");
    assertTransition(loan.status, "declined");
    await ctx.db.patch(loan._id, { status: "declined", decidedAt: Date.now() });
    await enqueueLoanNotification(ctx, loan._id, "loan_declined");
  },
});

/** Lender only: they're the one who gets the tool back. */
export const markReturned = mutation({
  args: { loanId: v.id("loans") },
  handler: async (ctx, { loanId }) => {
    const user = await requireUser(ctx);
    const loan = await getLoan(ctx, loanId);
    assertLoanParticipant(user, loan, "lender");
    assertTransition(loan.status, "returned");
    await ctx.db.patch(loan._id, { status: "returned", returnedAt: Date.now() });
    await enqueueLoanNotification(ctx, loan._id, "loan_returned");
  },
});

/** The borrower withdraws their own request while it's still pending. */
export const cancel = mutation({
  args: { loanId: v.id("loans") },
  handler: async (ctx, { loanId }) => {
    const user = await requireUser(ctx);
    const loan = await getLoan(ctx, loanId);
    assertLoanParticipant(user, loan, "borrower");
    assertTransition(loan.status, "cancelled");
    await ctx.db.patch(loan._id, { status: "cancelled", decidedAt: Date.now() });
    await enqueueLoanNotification(ctx, loan._id, "loan_cancelled");
  },
});

export const listMyRequests = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const loans = await ctx.db
      .query("loans")
      .withIndex("by_borrower", (q) => q.eq("borrowerId", user._id))
      .order("desc")
      .take(MAX_LIST);
    return await Promise.all(loans.map((loan) => toLoanView(ctx, loan, "lender")));
  },
});

export const listIncoming = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const loans = await ctx.db
      .query("loans")
      .withIndex("by_lender", (q) => q.eq("lenderId", user._id))
      .order("desc")
      .take(MAX_LIST);
    return await Promise.all(loans.map((loan) => toLoanView(ctx, loan, "borrower")));
  },
});

// Helpers (also used by admin.ts)

async function getLoan(ctx: Pick<QueryCtx, "db">, loanId: Id<"loans">) {
  const loan = await ctx.db.get(loanId);
  if (!loan) fail("NOT_FOUND", "That loan doesn't exist.");
  return loan;
}

function loansForTool(
  ctx: Pick<QueryCtx, "db">,
  toolId: Id<"tools">,
  status: Doc<"loans">["status"],
) {
  return ctx.db
    .query("loans")
    .withIndex("by_tool_status", (q) => q.eq("toolId", toolId).eq("status", status))
    .collect();
}

/** Counterpart's display name only, never their email. */
export async function toLoanView(
  ctx: Pick<QueryCtx, "db">,
  loan: Doc<"loans">,
  counterpart: "borrower" | "lender" | "both",
) {
  const [tool, borrower, lender, activity] = await Promise.all([
    ctx.db.get(loan.toolId),
    counterpart !== "lender" ? ctx.db.get(loan.borrowerId) : null,
    counterpart !== "borrower" ? ctx.db.get(loan.lenderId) : null,
    ctx.db
      .query("automationEvents")
      .withIndex("by_loan", (q) => q.eq("loanId", loan._id))
      .order("desc")
      .take(ACTIVITY_PER_LOAN),
  ]);
  return {
    _id: loan._id,
    _creationTime: loan._creationTime,
    startDate: loan.startDate,
    endDate: loan.endDate,
    status: deriveStatus(loan, todayUTC()),
    decidedAt: loan.decidedAt,
    returnedAt: loan.returnedAt,
    tool: {
      _id: loan.toolId,
      name: tool?.name ?? "Removed tool",
      category: tool?.category,
      isActive: tool?.isActive ?? false,
    },
    borrowerName: borrower?.name,
    lenderName: lender?.name,
    activity: activity.map((e) => ({
      _id: e._id,
      type: e.type,
      event: e.event,
      status: e.status,
      attempts: e.attempts,
      message: e.message,
      lastError: e.lastError,
      updatedAt: e.updatedAt,
    })),
  };
}
