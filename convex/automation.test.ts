import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { signedHeaders, verifySignature } from "./lib/hmac";
import { MAX_DELIVERY_ATTEMPTS } from "./lib/retry";
import {
  daysFromToday,
  identities,
  sampleTool,
  setup,
  signIn,
  type TestConvex,
} from "./test.setup";

const CONVEX_TO_N8N_SECRET = "test-convex-to-n8n";
const N8N_TO_CONVEX_SECRET = "test-n8n-to-convex";

let t: TestConvex;

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubEnv("N8N_WEBHOOK_URL", "https://n8n.test/webhook/lendloop-loan-events");
  vi.stubEnv("CONVEX_TO_N8N_SECRET", CONVEX_TO_N8N_SECRET);
  vi.stubEnv("N8N_TO_CONVEX_SECRET", N8N_TO_CONVEX_SECRET);
  t = setup();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

async function requestLoan() {
  const alice = await signIn(t, identities.alice);
  const bob = await signIn(t, identities.bob);
  const toolId = await alice.mutation(api.tools.create, sampleTool);
  const loanId = await bob.mutation(api.loans.request, {
    toolId,
    startDate: daysFromToday(1),
    endDate: daysFromToday(2),
  });
  return { alice, bob, toolId, loanId };
}

function eventsFor(loanId: Id<"loans">) {
  return t.run((ctx) =>
    ctx.db
      .query("automationEvents")
      .withIndex("by_loan", (q) => q.eq("loanId", loanId))
      .collect(),
  );
}

/** Sends a request to a Convex HTTP endpoint the way n8n does. */
async function n8nPost(
  path: string,
  payload: unknown,
  opts: { secret?: string; nowMs?: number } = {},
) {
  const body = JSON.stringify(payload);
  const headers = await signedHeaders(
    opts.secret ?? N8N_TO_CONVEX_SECRET,
    body,
    opts.nowMs,
  );
  return t.fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body,
  });
}

describe("Convex -> n8n notifications (outbox)", () => {
  it("sends a signed, minimal payload and marks the event sent", async () => {
    const fetchMock = vi.fn(async () => new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const { loanId } = await requestLoan();
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    const body = init.body as string;

    // n8n can verify it with the shared secret.
    expect(
      await verifySignature({
        secret: CONVEX_TO_N8N_SECRET,
        timestamp: headers["x-lendloop-timestamp"],
        signature: headers["x-lendloop-signature"],
        body,
      }),
    ).toEqual({ ok: true });

    // Data minimization: exactly these fields, and the recipient is the lender.
    const payload = JSON.parse(body);
    expect(Object.keys(payload).sort()).toEqual(
      [
        "endDate",
        "event",
        "eventId",
        "loanId",
        "recipient",
        "startDate",
        "toolName",
      ].sort(),
    );
    expect(payload.event).toBe("loan_requested");
    expect(payload.recipient).toEqual({ name: "Alice", email: identities.alice.email });

    const [event] = await eventsFor(loanId);
    expect(event.status).toBe("sent");
  });

  it("retries with backoff, then records the failure instead of failing silently", async () => {
    const fetchMock = vi.fn(async () => new Response("down", { status: 503 }));
    vi.stubGlobal("fetch", fetchMock);

    const { loanId } = await requestLoan();
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    expect(fetchMock).toHaveBeenCalledTimes(MAX_DELIVERY_ATTEMPTS);
    const events = await eventsFor(loanId);
    const notification = events.find((e) => e.type === "notification")!;
    expect(notification.status).toBe("failed");
    expect(notification.attempts).toBe(MAX_DELIVERY_ATTEMPTS);
    expect(notification.lastError).toContain("503");
    expect(events.some((e) => e.type === "error")).toBe(true);
  });

  it("marks the event failed straight away if n8n isn't configured", async () => {
    vi.stubEnv("N8N_WEBHOOK_URL", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { loanId } = await requestLoan();
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    expect(fetchMock).not.toHaveBeenCalled();
    const notification = (await eventsFor(loanId)).find(
      (e) => e.type === "notification",
    )!;
    expect(notification.status).toBe("failed");
    expect(notification.lastError).toMatch(/not set/);
  });
});

describe("n8n -> Convex HTTP endpoints", () => {
  /** An approved loan that ended three days ago. */
  async function overdueLoan() {
    const { toolId } = await requestLoan();
    return await t.run(async (ctx) => {
      const tool = (await ctx.db.get(toolId))!;
      const borrower = (await ctx.db
        .query("users")
        .withIndex("by_clerkId", (q) => q.eq("clerkId", identities.bob.subject))
        .unique())!;
      return await ctx.db.insert("loans", {
        toolId,
        borrowerId: borrower._id,
        lenderId: tool.ownerId,
        startDate: daysFromToday(-5),
        endDate: daysFromToday(-3),
        status: "approved",
      });
    });
  }

  it("rejects unsigned, wrongly signed and stale requests", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("ok")),
    );
    const unsigned = await t.fetch("/n8n/overdue-loans", { method: "POST", body: "{}" });
    expect(unsigned.status).toBe(401);

    const wrongSecret = await n8nPost("/n8n/overdue-loans", {}, { secret: "nope" });
    expect(wrongSecret.status).toBe(401);

    const stale = await n8nPost(
      "/n8n/overdue-loans",
      {},
      { nowMs: Date.now() - 10 * 60 * 1000 },
    );
    expect(stale.status).toBe(401);
  });

  it("lists overdue loans with only the fields a reminder needs", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("ok")),
    );
    const loanId = await overdueLoan();

    const res = await n8nPost("/n8n/overdue-loans", {});
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.count).toBe(1);
    expect(data.loans[0]).toMatchObject({
      loanId,
      borrowerName: "Bob",
      borrowerEmail: identities.bob.email,
      toolName: sampleTool.name,
      daysOverdue: 3,
    });
    expect(Object.keys(data.loans[0]).sort()).toEqual(
      [
        "borrowerEmail",
        "borrowerName",
        "daysOverdue",
        "endDate",
        "idempotencyKey",
        "loanId",
        "toolName",
      ].sort(),
    );
  });

  it("records a reminder once, even when n8n retries the same write", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("ok")),
    );
    const loanId = await overdueLoan();
    const listed = await (await n8nPost("/n8n/overdue-loans", {})).json();
    const reminder = {
      loanId,
      idempotencyKey: listed.loans[0].idempotencyKey,
      status: "sent",
      message: "Reminder sent to Bob",
    };

    const first = await n8nPost("/n8n/reminders", reminder);
    expect(await first.json()).toEqual({ ok: true, duplicate: false });
    const retry = await n8nPost("/n8n/reminders", reminder);
    expect(await retry.json()).toEqual({ ok: true, duplicate: true });

    const reminders = (await eventsFor(loanId)).filter((e) => e.type === "reminder");
    expect(reminders).toHaveLength(1);

    // Already reminded today, so a re-run of the workflow skips this loan.
    const again = await (await n8nPost("/n8n/overdue-loans", {})).json();
    expect(again.count).toBe(0);
  });

  it("rejects a reminder whose key belongs to a different loan", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("ok")),
    );
    const loanId = await overdueLoan();
    const res = await n8nPost("/n8n/reminders", {
      loanId,
      idempotencyKey: "reminder:some-other-loan:2026-01-01",
      message: "x",
    });
    expect(res.status).toBe(400);
  });

  it("records an n8n workflow failure once per execution", async () => {
    const failure = {
      workflowName: "LendLoop - Overdue reminders",
      executionId: "1234",
      nodeName: "Fetch overdue loans",
      message: "ECONNREFUSED",
    };
    expect(await (await n8nPost("/n8n/automation-errors", failure)).json()).toEqual({
      ok: true,
      duplicate: false,
    });
    expect(await (await n8nPost("/n8n/automation-errors", failure)).json()).toEqual({
      ok: true,
      duplicate: true,
    });
  });

  it("returns 400 for a signed request with missing fields", async () => {
    const res = await n8nPost("/n8n/automation-errors", { workflowName: "x" });
    expect(res.status).toBe(400);
  });
});
