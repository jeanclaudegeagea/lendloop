#!/usr/bin/env node
// Sends a signed request to a LendLoop Convex HTTP endpoint, the same way
// n8n does. Handy for checking the endpoints before n8n is running.
//
//   CONVEX_SITE_URL=https://xxx.convex.site N8N_TO_CONVEX_SECRET=... \
//     node scripts/signed-request.mjs /n8n/overdue-loans '{}'
//
// Add --bad-signature to see the 401.

import { createHmac } from "node:crypto";

const [path, body = "{}", flag] = process.argv.slice(2);
const { CONVEX_SITE_URL, N8N_TO_CONVEX_SECRET } = process.env;

if (!path || !CONVEX_SITE_URL || !N8N_TO_CONVEX_SECRET) {
  console.error(
    "Usage: CONVEX_SITE_URL=... N8N_TO_CONVEX_SECRET=... node scripts/signed-request.mjs <path> [json-body] [--bad-signature]",
  );
  process.exit(1);
}

const timestamp = String(Math.floor(Date.now() / 1000));
const secret = flag === "--bad-signature" ? "wrong-secret" : N8N_TO_CONVEX_SECRET;
const signature = createHmac("sha256", secret)
  .update(`${timestamp}.${body}`)
  .digest("hex");

const res = await fetch(new URL(path, CONVEX_SITE_URL), {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-lendloop-timestamp": timestamp,
    "x-lendloop-signature": `sha256=${signature}`,
  },
  body,
});
console.log(res.status, await res.text());
