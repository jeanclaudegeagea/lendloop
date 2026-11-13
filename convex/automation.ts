import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  internalAction,
  internalMutation,
  internalQuery,
  type MutationCtx,
} from "./_generated/server";
import { daysBetween } from "./lib/dates";
import { signedHeaders } from "./lib/hmac";
import { backoffMs, MAX_DELIVERY_ATTEMPTS } from "./lib/retry";

// Internal only: called by the outbox action and the signed routes in http.ts.

const DELIVERY_TIMEOUT_MS = 10_000;
const MAX_MESSAGE_LENGTH = 500;

// Convex → n8n: loan notifications (workflow 1)

/** Only the recipient's contact details; no user ids, roles or the other party's email. */
export type NotificationPayload = {
  eventId: Id<"automationEvents">;
  event: Doc<"automationEvents">["event"];
  loanId: Id<"loans">;
  recipient: { name: string; email: string };
  toolName: string;
  startDate: string;
  endDate: string;
};

export const getNotificationPayload = internalQuery({
  args: { eventId: v.id("automationEvents") },
  handler: async (ctx, { eventId }) => {
    const event = await ctx.db.get(eventId);
    if (!event?.loanId) return null;
    const loan = await ctx.db.get(event.loanId);
    if (!loan) return null;
    const tool = await ctx.db.get(loan.toolId);
    // Requests go to the lender; every later status change goes to the borrower.
    const recipientId =
      event.event === "loan_requested" ? loan.lenderId : loan.borrowerId;
    const recipient = await ctx.db.get(recipientId);
    if (!recipient) return null;

    const payload: NotificationPayload = {
      eventId: event._id,
      event: event.event,
      loanId: loan._id,
      recipient: { name: recipient.name, email: recipient.email },
      toolName: tool?.name ?? "a tool",
      startDate: loan.startDate,
      endDate: loan.endDate,
    };
    return { status: event.status, payload };
  },
});

/** Signs and POSTs one notification to n8n. Retries with backoff, then records the failure. */
export const deliverNotification = internalAction({
  args: { eventId: v.id("automationEvents"), attempt: v.number() },
  handler: async (ctx, { eventId, attempt }) => {
    const data = await ctx.runQuery(internal.automation.getNotificationPayload, {
      eventId,
    });
    if (!data || data.status === "sent") return;

    const url = process.env.N8N_WEBHOOK_URL;
    const secret = process.env.CONVEX_TO_N8N_SECRET;
    if (!url || !secret) {
      // A setup problem, not a transient one, so don't retry.
      await ctx.runMutation(internal.automation.recordDeliveryResult, {
        eventId,
        attempt,
        error:
          "N8N_WEBHOOK_URL or CONVEX_TO_N8N_SECRET is not set on the Convex deployment",
        final: true,
      });
      return;
    }

    const body = JSON.stringify(data.payload);
    let error: string | undefined;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(await signedHeaders(secret, body)),
        },
        body,
        signal: controller.signal,
      });
      if (!res.ok) error = `n8n responded with HTTP ${res.status}`;
    } catch (e) {
      error = controller.signal.aborted
        ? `n8n did not respond within ${DELIVERY_TIMEOUT_MS / 1000}s`
        : `Network error: ${e instanceof Error ? e.message : String(e)}`;
    } finally {
      clearTimeout(timer);
    }

    const final = error !== undefined && attempt >= MAX_DELIVERY_ATTEMPTS;
    await ctx.runMutation(internal.automation.recordDeliveryResult, {
      eventId,
      attempt,
      error,
      final,
    });
    if (error !== undefined && !final) {
      await ctx.scheduler.runAfter(
        backoffMs(attempt),
        internal.automation.deliverNotification,
        {
          eventId,
          attempt: attempt + 1,
        },
      );
    }
  },
});

export const recordDeliveryResult = internalMutation({
  args: {
    eventId: v.id("automationEvents"),
    attempt: v.number(),
    error: v.optional(v.string()),
    final: v.boolean(),
  },
  handler: async (ctx, { eventId, attempt, error, final }) => {
    const event = await ctx.db.get(eventId);
    if (!event) return;
    const now = Date.now();

    if (error === undefined) {
      // The n8n callback may already have set the message.
      await ctx.db.patch(eventId, {
        status: "sent",
        attempts: attempt,
        lastError: undefined,
        message: event.message ?? "Notification accepted by n8n",
        updatedAt: now,
      });
      return;
    }

    console.error(
      `Notification ${eventId} (${event.event}) attempt ${attempt} failed: ${error}`,
    );
    await ctx.db.patch(eventId, {
      status: final ? "failed" : "pending",
      attempts: attempt,
      lastError: error,
      updatedAt: now,
    });
    if (final) {
      await insertErrorEvent(ctx, {
        idempotencyKey: `error:delivery:${eventId}`,
        loanId: event.loanId,
        message: `Couldn't deliver the ${event.event.replace("loan_", "")} notification after ${attempt} attempt(s): ${error}`,
      });
    }
  },
});

/** n8n's confirmation after sending. Idempotent. */
export const recordNotificationSent = internalMutation({
  args: { eventId: v.string(), message: v.string() },
  handler: async (ctx, { eventId, message }) => {
    const id = ctx.db.normalizeId("automationEvents", eventId);
    const event = id ? await ctx.db.get(id) : null;
    if (!event || event.type !== "notification") return { found: false as const };
    if (event.status === "sent" && event.message === truncate(message)) {
      return { found: true as const, duplicate: true };
    }
    await ctx.db.patch(event._id, {
      status: "sent",
      message: truncate(message),
      lastError: undefined,
      updatedAt: Date.now(),
    });
    return { found: true as const, duplicate: false };
  },
});

// n8n → Convex: overdue reminders (workflow 2)

export function reminderKey(loanId: Id<"loans">, today: string): string {
  return `reminder:${loanId}:${today}`;
}

/** Overdue approved loans, minus those already reminded today. */
export const listOverdueLoans = internalQuery({
  args: { today: v.string() },
  handler: async (ctx, { today }) => {
    const overdue = await ctx.db
      .query("loans")
      .withIndex("by_status_endDate", (q) =>
        q.eq("status", "approved").lt("endDate", today),
      )
      .take(500);

    const results = [];
    for (const loan of overdue) {
      const idempotencyKey = reminderKey(loan._id, today);
      const alreadySent = await ctx.db
        .query("automationEvents")
        .withIndex("by_idempotencyKey", (q) => q.eq("idempotencyKey", idempotencyKey))
        .first();
      if (alreadySent) continue;

      const [borrower, tool] = await Promise.all([
        ctx.db.get(loan.borrowerId),
        ctx.db.get(loan.toolId),
      ]);
      if (!borrower) continue;
      results.push({
        loanId: loan._id,
        idempotencyKey,
        borrowerName: borrower.name,
        borrowerEmail: borrower.email,
        toolName: tool?.name ?? "a tool",
        endDate: loan.endDate,
        daysOverdue: daysBetween(loan.endDate, today),
      });
    }
    return results;
  },
});

/** Idempotent on idempotencyKey, so n8n retries are no-ops. */
export const recordReminder = internalMutation({
  args: {
    loanId: v.string(),
    idempotencyKey: v.string(),
    status: v.union(v.literal("sent"), v.literal("failed")),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const loanId = ctx.db.normalizeId("loans", args.loanId);
    const loan = loanId ? await ctx.db.get(loanId) : null;
    if (!loan) return { result: "loan_not_found" as const };
    // The key must belong to this loan.
    if (!args.idempotencyKey.startsWith(`reminder:${loan._id}:`)) {
      return { result: "invalid_key" as const };
    }

    const existing = await ctx.db
      .query("automationEvents")
      .withIndex("by_idempotencyKey", (q) => q.eq("idempotencyKey", args.idempotencyKey))
      .first();
    if (existing) return { result: "duplicate" as const, eventId: existing._id };

    const eventId = await ctx.db.insert("automationEvents", {
      loanId: loan._id,
      type: "reminder",
      event: "loan_overdue",
      status: args.status,
      idempotencyKey: args.idempotencyKey,
      attempts: 1,
      message: truncate(args.message),
      updatedAt: Date.now(),
    });
    return { result: "created" as const, eventId };
  },
});

// n8n → Convex: error workflow

/** One record per failed n8n execution. */
export const recordAutomationError = internalMutation({
  args: {
    workflowName: v.string(),
    executionId: v.string(),
    nodeName: v.optional(v.string()),
    message: v.string(),
    loanId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const loanId = args.loanId ? ctx.db.normalizeId("loans", args.loanId) : null;
    const created = await insertErrorEvent(ctx, {
      idempotencyKey: `error:n8n:${args.workflowName}:${args.executionId}`,
      loanId: loanId ?? undefined,
      message: `n8n workflow "${args.workflowName}" failed${
        args.nodeName ? ` at "${args.nodeName}"` : ""
      }: ${args.message}`,
    });
    return { result: created ? ("created" as const) : ("duplicate" as const) };
  },
});

async function insertErrorEvent(
  ctx: MutationCtx,
  args: { idempotencyKey: string; loanId?: Id<"loans">; message: string },
): Promise<boolean> {
  const existing = await ctx.db
    .query("automationEvents")
    .withIndex("by_idempotencyKey", (q) => q.eq("idempotencyKey", args.idempotencyKey))
    .first();
  if (existing) return false;
  await ctx.db.insert("automationEvents", {
    loanId: args.loanId,
    type: "error",
    event: "workflow_failed",
    status: "failed",
    idempotencyKey: args.idempotencyKey,
    attempts: 1,
    message: truncate(args.message),
    updatedAt: Date.now(),
  });
  return true;
}

function truncate(text: string): string {
  return text.length > MAX_MESSAGE_LENGTH
    ? `${text.slice(0, MAX_MESSAGE_LENGTH - 1)}…`
    : text;
}
