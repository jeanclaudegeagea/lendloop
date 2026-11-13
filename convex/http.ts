import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import { httpAction, type ActionCtx } from "./_generated/server";
import { todayUTC } from "./lib/dates";
import { SIGNATURE_HEADER, TIMESTAMP_HEADER, verifySignature } from "./lib/hmac";

// Endpoints for n8n, served on the .convex.site URL. The HMAC is checked before
// the body is parsed. All POST, so the signature always covers a body.

const MAX_BODY_BYTES = 64 * 1024;

class BadRequest extends Error {}

type JsonObject = Record<string, unknown>;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function requireString(body: JsonObject, key: string): string {
  const value = body[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new BadRequest(`"${key}" must be a non-empty string`);
  }
  return value;
}

function optionalString(body: JsonObject, key: string): string | undefined {
  const value = body[key];
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") throw new BadRequest(`"${key}" must be a string`);
  return value;
}

/** Size limit, signature, JSON parse, handler. 4xx = don't retry, 5xx = safe to retry. */
function signedEndpoint(
  handler: (ctx: ActionCtx, body: JsonObject) => Promise<Response>,
) {
  return httpAction(async (ctx, request) => {
    const path = new URL(request.url).pathname;
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) return json({ error: "Payload too large" }, 413);

    const check = await verifySignature({
      secret: process.env.N8N_TO_CONVEX_SECRET,
      timestamp: request.headers.get(TIMESTAMP_HEADER),
      signature: request.headers.get(SIGNATURE_HEADER),
      body: raw,
    });
    if (!check.ok) {
      if (check.reason === "not_configured") {
        console.error("N8N_TO_CONVEX_SECRET is not set; rejecting all n8n requests.");
        return json({ error: "Server misconfigured" }, 500);
      }
      console.warn(`Rejected unsigned/invalid request to ${path}: ${check.reason}`);
      // The reason is logged, not returned.
      return json({ error: "Unauthorized" }, 401);
    }

    let body: unknown;
    try {
      body = raw ? JSON.parse(raw) : {};
    } catch {
      return json({ error: "Body must be JSON" }, 400);
    }
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return json({ error: "Body must be a JSON object" }, 400);
    }

    try {
      return await handler(ctx, body as JsonObject);
    } catch (e) {
      if (e instanceof BadRequest) return json({ error: e.message }, 400);
      console.error(`Error handling ${path}:`, e);
      return json({ error: "Internal error" }, 500);
    }
  });
}

const http = httpRouter();

/** Workflow 2: overdue loans to remind. */
http.route({
  path: "/n8n/overdue-loans",
  method: "POST",
  handler: signedEndpoint(async (ctx) => {
    const today = todayUTC();
    const loans = await ctx.runQuery(internal.automation.listOverdueLoans, { today });
    return json({ today, count: loans.length, loans });
  }),
});

/** Workflow 2: reminder write-back. */
http.route({
  path: "/n8n/reminders",
  method: "POST",
  handler: signedEndpoint(async (ctx, body) => {
    const status = body.status ?? "sent";
    if (status !== "sent" && status !== "failed") {
      throw new BadRequest(`"status" must be "sent" or "failed"`);
    }
    const result = await ctx.runMutation(internal.automation.recordReminder, {
      loanId: requireString(body, "loanId"),
      idempotencyKey: requireString(body, "idempotencyKey"),
      status,
      message: requireString(body, "message"),
    });
    if (result.result === "loan_not_found") return json({ error: "Unknown loan" }, 404);
    if (result.result === "invalid_key")
      return json({ error: "Key doesn't match loan" }, 400);
    // A duplicate counts as success, so n8n stops retrying.
    return json({ ok: true, duplicate: result.result === "duplicate" });
  }),
});

/** Workflow 1: notification confirmation. */
http.route({
  path: "/n8n/notifications",
  method: "POST",
  handler: signedEndpoint(async (ctx, body) => {
    const result = await ctx.runMutation(internal.automation.recordNotificationSent, {
      eventId: requireString(body, "eventId"),
      message: requireString(body, "message"),
    });
    if (!result.found) return json({ error: "Unknown event" }, 404);
    return json({ ok: true, duplicate: result.duplicate });
  }),
});

/** Error workflow: a failed n8n execution. */
http.route({
  path: "/n8n/automation-errors",
  method: "POST",
  handler: signedEndpoint(async (ctx, body) => {
    const result = await ctx.runMutation(internal.automation.recordAutomationError, {
      workflowName: requireString(body, "workflowName"),
      executionId: requireString(body, "executionId"),
      nodeName: optionalString(body, "nodeName"),
      message: requireString(body, "message"),
      loanId: optionalString(body, "loanId"),
    });
    return json({ ok: true, duplicate: result.result === "duplicate" });
  }),
});

export default http;
