import { describe, expect, it } from "vitest";
import {
  signPayload,
  signedHeaders,
  verifySignature,
  SIGNATURE_HEADER,
  TIMESTAMP_HEADER,
} from "./hmac";

const SECRET = "test-secret";
const BODY = JSON.stringify({ loanId: "abc", event: "loan_approved" });
const NOW = Date.UTC(2026, 5, 10, 12, 0, 0);

async function signed(body = BODY, nowMs = NOW) {
  const headers = await signedHeaders(SECRET, body, nowMs);
  return { timestamp: headers[TIMESTAMP_HEADER], signature: headers[SIGNATURE_HEADER] };
}

describe("HMAC signing", () => {
  it("matches a reference HMAC-SHA256 (what n8n's crypto.createHmac produces)", async () => {
    // Computed independently with both:
    //   printf '%s' '1700000000.{}' | openssl dgst -sha256 -hmac test-secret
    //   crypto.createHmac('sha256','test-secret').update('1700000000.{}').digest('hex')
    expect(await signPayload(SECRET, "1700000000", "{}")).toBe(
      "sha256=87d3ed18b9b403e7da0fc3a3ae8b9394303805a049ea06f87c2ef4380b521fa9",
    );
  });

  it("accepts a correctly signed, fresh request", async () => {
    const { timestamp, signature } = await signed();
    expect(
      await verifySignature({
        secret: SECRET,
        timestamp,
        signature,
        body: BODY,
        nowMs: NOW,
      }),
    ).toEqual({ ok: true });
  });

  it("rejects a tampered body", async () => {
    const { timestamp, signature } = await signed();
    const result = await verifySignature({
      secret: SECRET,
      timestamp,
      signature,
      body: BODY.replace("loan_approved", "loan_declined"),
      nowMs: NOW,
    });
    expect(result).toEqual({ ok: false, reason: "bad_signature" });
  });

  it("rejects a signature made with a different secret", async () => {
    const { timestamp } = await signed();
    const forged = await signPayload("wrong-secret", timestamp, BODY);
    const result = await verifySignature({
      secret: SECRET,
      timestamp,
      signature: forged,
      body: BODY,
      nowMs: NOW,
    });
    expect(result).toEqual({ ok: false, reason: "bad_signature" });
  });

  it("rejects a replay older than 5 minutes, even with a valid signature", async () => {
    const { timestamp, signature } = await signed();
    const sixMinutesLater = NOW + 6 * 60 * 1000;
    const result = await verifySignature({
      secret: SECRET,
      timestamp,
      signature,
      body: BODY,
      nowMs: sixMinutesLater,
    });
    expect(result).toEqual({ ok: false, reason: "stale_timestamp" });
  });

  it("rejects a moved timestamp (the timestamp is part of the signed string)", async () => {
    const { timestamp, signature } = await signed();
    const result = await verifySignature({
      secret: SECRET,
      timestamp: String(Number(timestamp) + 1),
      signature,
      body: BODY,
      nowMs: NOW,
    });
    expect(result).toEqual({ ok: false, reason: "bad_signature" });
  });

  it("reports missing headers and a missing secret separately", async () => {
    expect(
      await verifySignature({
        secret: SECRET,
        timestamp: null,
        signature: null,
        body: BODY,
      }),
    ).toEqual({ ok: false, reason: "missing_headers" });
    expect(
      await verifySignature({
        secret: undefined,
        timestamp: "1",
        signature: "x",
        body: BODY,
      }),
    ).toEqual({ ok: false, reason: "not_configured" });
  });

  it("rejects malformed signatures without throwing", async () => {
    const { timestamp } = await signed();
    const result = await verifySignature({
      secret: SECRET,
      timestamp,
      signature: "sha256=not-hex!",
      body: BODY,
      nowMs: NOW,
    });
    expect(result).toEqual({ ok: false, reason: "bad_signature" });
  });
});
