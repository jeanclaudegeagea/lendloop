// @vitest-environment node
// Runs the JavaScript from the exported n8n Code nodes against the real
// Convex HMAC code, so the two sides can't drift apart unnoticed.
// The Crypto node is stood in for by Node's createHmac, which is what it uses.
import { createHmac } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { signedHeaders, verifySignature } from "../convex/lib/hmac";

type N8nNode = { name: string; type: string; parameters: Record<string, unknown> };
type Workflow = {
  name: string;
  nodes: N8nNode[];
  settings: Record<string, unknown>;
  connections: unknown;
};
type Item = { json: Record<string, unknown> };

const DIR = join(__dirname, "workflows");
const files = readdirSync(DIR).filter((f) => f.endsWith(".json"));
const workflows = Object.fromEntries(
  files.map((f) => [f, JSON.parse(readFileSync(join(DIR, f), "utf8")) as Workflow]),
);

const ENV = {
  CONVEX_TO_N8N_SECRET: "c2n-secret",
  N8N_TO_CONVEX_SECRET: "n2c-secret",
  CONVEX_SITE_URL: "https://example.convex.site",
};

function node(file: string, name: string): N8nNode {
  const found = workflows[file].nodes.find((n) => n.name === name);
  if (!found) throw new Error(`No node "${name}" in ${file}`);
  return found;
}

/** Runs a Code node's jsCode the way n8n does ("run once for all items"). */
function runCode(file: string, name: string, items: Item[]): Item[] {
  const jsCode = node(file, name).parameters.jsCode as string;
  const $input = { first: () => items[0], all: () => items };
  const quietConsole = { log() {}, warn() {}, error() {} };
  return new Function("$input", "$env", "console", jsCode)($input, ENV, quietConsole);
}

/** Mimics n8n's Crypto node (HMAC, SHA256, hex) with the secret from $env. */
function runHmac(file: string, name: string, items: Item[]): Item[] {
  const p = node(file, name).parameters as Record<string, string>;
  const secretEnv = p.secret.match(/\$env\.(\w+)/)![1] as keyof typeof ENV;
  return items.map(({ json }) => ({
    json: {
      ...json,
      [p.dataPropertyName]: createHmac("sha256", ENV[secretEnv])
        .update(String(json.toSign))
        .digest("hex"),
    },
  }));
}

/** Checks a request that n8n would send, using the real Convex verifier. */
async function convexAccepts(item: Item) {
  const { body, timestamp, signature } = item.json as Record<string, string>;
  return verifySignature({
    secret: ENV.N8N_TO_CONVEX_SECRET,
    timestamp,
    signature: `sha256=${signature}`,
    body,
  });
}

describe("exported workflows", () => {
  it.each(files)("%s contains no secrets, only $env references", (file) => {
    const raw = readFileSync(join(DIR, file), "utf8");
    expect(raw).not.toMatch(/c2n-secret|n2c-secret|sk_(test|live)_|pk_(test|live)_/);
    for (const n of workflows[file].nodes.filter(
      (x) => x.type === "n8n-nodes-base.crypto",
    )) {
      expect(n.parameters.secret).toMatch(/^=\{\{ \$env\.\w+ \}\}$/);
    }
  });

  it("main workflows point at the error workflow and retry their HTTP calls", () => {
    for (const file of ["01-loan-notifications.json", "02-overdue-reminders.json"]) {
      expect(workflows[file].settings.errorWorkflow).toBe("LendLoopErrorWf0");
      const http = workflows[file].nodes.filter(
        (n) => n.type === "n8n-nodes-base.httpRequest",
      ) as unknown as { retryOnFail: boolean; maxTries: number }[];
      expect(http.length).toBeGreaterThan(0);
      for (const h of http) expect(h).toMatchObject({ retryOnFail: true, maxTries: 3 });
    }
  });
});

describe("workflow 1: verifying Convex's signature inside n8n", () => {
  const F = "01-loan-notifications.json";
  const payload = {
    eventId: "evt123",
    event: "loan_approved",
    loanId: "loan123",
    recipient: { name: "Bob", email: "bob@example.com" },
    toolName: "Cordless drill",
    startDate: "2026-06-10",
    endDate: "2026-06-12",
  };

  /** Simulates n8n's webhook item: lowercased headers + parsed JSON body. */
  async function webhookItem(
    opts: { secret?: string; nowMs?: number; tamper?: boolean } = {},
  ) {
    const body = JSON.stringify(payload);
    const headers = await signedHeaders(
      opts.secret ?? ENV.CONVEX_TO_N8N_SECRET,
      body,
      opts.nowMs,
    );
    const parsed = JSON.parse(body);
    if (opts.tamper) parsed.event = "loan_declined";
    return [{ json: { headers, body: parsed } }];
  }

  function verify(items: Item[]) {
    const prepared = runCode(F, "Prepare signature check", items);
    const hashed = runHmac(F, "Compute expected HMAC", prepared);
    return runCode(F, "Verify signature + timestamp", hashed)[0].json;
  }

  it("accepts a request signed by Convex", async () => {
    expect(verify(await webhookItem())).toMatchObject({ valid: true, reason: null });
  });

  it("rejects a wrong secret, a tampered body and a stale timestamp", async () => {
    expect(verify(await webhookItem({ secret: "wrong" }))).toMatchObject({
      valid: false,
      reason: "bad_signature",
    });
    expect(verify(await webhookItem({ tamper: true }))).toMatchObject({
      valid: false,
      reason: "bad_signature",
    });
    expect(verify(await webhookItem({ nowMs: Date.now() - 10 * 60_000 }))).toMatchObject({
      valid: false,
      reason: "stale_timestamp",
    });
  });

  it("signs the confirmation so Convex accepts it, without sending the email back", async () => {
    const { payload: verified } = verify(await webhookItem());
    const composed = runCode(F, "Compose notification", [
      { json: { payload: verified } as Item["json"] },
    ]);
    const sent = runCode(F, "Send notification (mock)", composed);
    const signed = runHmac(F, "HMAC confirmation", runCode(F, "Sign confirmation", sent));

    expect(await convexAccepts(signed[0])).toEqual({ ok: true });
    const body = JSON.parse(signed[0].json.body as string);
    expect(Object.keys(body).sort()).toEqual(["eventId", "message"]);
    expect(signed[0].json.body).not.toContain("bob@example.com");
  });
});

describe("workflow 2: overdue reminders", () => {
  const F = "02-overdue-reminders.json";

  it("signs the overdue-loans request so Convex accepts it", async () => {
    const signed = runHmac(F, "HMAC request", runCode(F, "Sign request", [{ json: {} }]));
    expect(await convexAccepts(signed[0])).toEqual({ ok: true });
  });

  it("writes back each reminder with Convex's idempotency key, signed", async () => {
    const loans: Item[] = [
      {
        json: {
          loanId: "loan1",
          idempotencyKey: "reminder:loan1:2026-06-10",
          borrowerName: "Bob",
          borrowerEmail: "bob@example.com",
          toolName: "Ladder",
          endDate: "2026-06-07",
          daysOverdue: 3,
        },
      },
    ];
    const sent = runCode(F, "Send reminder (mock)", loans);
    const signed = runHmac(F, "HMAC write-back", runCode(F, "Sign write-back", sent));

    expect(await convexAccepts(signed[0])).toEqual({ ok: true });
    expect(JSON.parse(signed[0].json.body as string)).toMatchObject({
      loanId: "loan1",
      idempotencyKey: "reminder:loan1:2026-06-10",
      status: "sent",
    });
  });
});

describe("error workflow", () => {
  const F = "00-error-handler.json";

  it("builds a signed error report from n8n's Error Trigger output", async () => {
    const errorTriggerItem: Item = {
      json: {
        execution: {
          id: "981",
          lastNodeExecuted: "Fetch overdue loans",
          error: { message: "connect ECONNREFUSED" },
        },
        workflow: { id: "LendLoopRemindWf", name: "LendLoop - Overdue reminders" },
      },
    };
    const signed = runHmac(
      F,
      "HMAC report",
      runCode(F, "Build error report", [errorTriggerItem]),
    );
    expect(await convexAccepts(signed[0])).toEqual({ ok: true });
    expect(JSON.parse(signed[0].json.body as string)).toEqual({
      workflowName: "LendLoop - Overdue reminders",
      executionId: "981",
      nodeName: "Fetch overdue loans",
      message: "connect ECONNREFUSED",
    });
  });
});
