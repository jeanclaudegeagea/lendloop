#!/usr/bin/env node
// Makes the "Loan notifications" workflow fail on purpose, to test the n8n
// Error workflow end to end without stopping anything.
//
// It sends n8n a correctly signed loan event (exactly what Convex sends) whose
// eventId doesn't exist. n8n accepts the signature and sends the mock
// notification, but its write-back to Convex gets 404 "Unknown event". After
// 3 retries the run fails, the Error handler fires, and Convex records an
// "error" automation event (visible in the Convex dashboard and n8n logs).
//
//   N8N_WEBHOOK_URL=http://localhost:5678/webhook/lendloop-loan-events \
//   CONVEX_TO_N8N_SECRET=... node scripts/trigger-n8n-failure.mjs
//
// Expected output: "n8n replied 500 ..." (the workflow failed, as intended).

import { createHmac } from "node:crypto";

const { N8N_WEBHOOK_URL, CONVEX_TO_N8N_SECRET } = process.env;
if (!N8N_WEBHOOK_URL || !CONVEX_TO_N8N_SECRET) {
  console.error(
    "Usage: N8N_WEBHOOK_URL=... CONVEX_TO_N8N_SECRET=... node scripts/trigger-n8n-failure.mjs",
  );
  process.exit(1);
}

const today = new Date().toISOString().slice(0, 10);
const body = JSON.stringify({
  eventId: `failure_test_${Date.now()}`,
  event: "loan_requested",
  loanId: "failure_test_loan",
  recipient: { name: "Failure Test", email: "failure-test+clerk_test@example.com" },
  toolName: "Failure test tool",
  startDate: today,
  endDate: today,
});
const timestamp = String(Math.floor(Date.now() / 1000));
const signature = createHmac("sha256", CONVEX_TO_N8N_SECRET)
  .update(`${timestamp}.${body}`)
  .digest("hex");

const res = await fetch(N8N_WEBHOOK_URL, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-lendloop-timestamp": timestamp,
    "x-lendloop-signature": `sha256=${signature}`,
  },
  body,
});
console.log(`n8n replied ${res.status} ${await res.text()}`);
if (res.status === 401) {
  console.error("401: CONVEX_TO_N8N_SECRET doesn't match the value in n8n/.env.");
} else if (res.status === 500) {
  console.log(
    "Workflow failed as intended. Within a few seconds the Error handler records it in Convex:\n" +
      '  npx convex data automationEvents --limit 1   (type "error", event "workflow_failed")',
  );
}
