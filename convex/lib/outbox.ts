import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

export type LoanEvent =
  "loan_requested" | "loan_approved" | "loan_declined" | "loan_returned";

/**
 * Transactional outbox: the event row and the delivery job are written in the
 * same transaction as the loan change, so they commit or roll back together.
 */
export async function enqueueLoanNotification(
  ctx: MutationCtx,
  loanId: Id<"loans">,
  event: LoanEvent,
): Promise<void> {
  const idempotencyKey = `notification:${loanId}:${event}`;
  const existing = await ctx.db
    .query("automationEvents")
    .withIndex("by_idempotencyKey", (q) => q.eq("idempotencyKey", idempotencyKey))
    .first();
  if (existing) return;

  const eventId = await ctx.db.insert("automationEvents", {
    loanId,
    type: "notification",
    event,
    status: "pending",
    idempotencyKey,
    attempts: 0,
    updatedAt: Date.now(),
  });
  await ctx.scheduler.runAfter(0, internal.automation.deliverNotification, {
    eventId,
    attempt: 1,
  });
}
