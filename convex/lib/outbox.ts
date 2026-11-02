import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

export type LoanEvent =
  "loan_requested" | "loan_approved" | "loan_declined" | "loan_returned";

/**
 * Transactional outbox: records a pending notification in the same
 * transaction as the loan change, then schedules the action that sends it to
 * n8n. If the mutation rolls back, the event and the scheduled job roll back
 * with it, so a notification is never lost or sent for a change that
 * didn't happen.
 *
 * Each event happens at most once per loan (the status machine guarantees
 * it), so `loanId + event` is a natural idempotency key.
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
