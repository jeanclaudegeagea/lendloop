// HMAC-SHA256 signing for both directions, on Web Crypto (runs in Convex and Vitest).
//   X-LendLoop-Timestamp: <unix seconds>
//   X-LendLoop-Signature: sha256=<hex HMAC of "<timestamp>.<raw body>">
// The timestamp is part of the signed string and must be within 5 minutes.

export const TIMESTAMP_HEADER = "x-lendloop-timestamp";
export const SIGNATURE_HEADER = "x-lendloop-signature";
export const MAX_CLOCK_SKEW_SECONDS = 5 * 60;

const encoder = new TextEncoder();

function importKey(secret: string, usage: "sign" | "verify"): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    [usage],
  );
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (b) => b.toString(16).padStart(2, "0")).join(
    "",
  );
}

function fromHex(hex: string): Uint8Array<ArrayBuffer> | null {
  if (hex.length % 2 !== 0 || !/^[0-9a-f]*$/i.test(hex)) return null;
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++)
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

export async function signPayload(
  secret: string,
  timestamp: string,
  body: string,
): Promise<string> {
  const key = await importKey(secret, "sign");
  const mac = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`${timestamp}.${body}`),
  );
  return `sha256=${toHex(mac)}`;
}

export async function signedHeaders(
  secret: string,
  body: string,
  nowMs: number = Date.now(),
): Promise<Record<string, string>> {
  const timestamp = String(Math.floor(nowMs / 1000));
  return {
    [TIMESTAMP_HEADER]: timestamp,
    [SIGNATURE_HEADER]: await signPayload(secret, timestamp, body),
  };
}

export type VerifyFailure =
  "not_configured" | "missing_headers" | "stale_timestamp" | "bad_signature";
export type VerifyResult = { ok: true } | { ok: false; reason: VerifyFailure };

export async function verifySignature(opts: {
  secret: string | undefined;
  timestamp: string | null;
  signature: string | null;
  body: string;
  nowMs?: number;
}): Promise<VerifyResult> {
  const { secret, timestamp, signature, body, nowMs = Date.now() } = opts;
  if (!secret) return { ok: false, reason: "not_configured" };
  if (!timestamp || !signature) return { ok: false, reason: "missing_headers" };

  if (!/^\d{1,12}$/.test(timestamp)) return { ok: false, reason: "stale_timestamp" };
  const skew = Math.abs(nowMs / 1000 - Number(timestamp));
  if (skew > MAX_CLOCK_SKEW_SECONDS) return { ok: false, reason: "stale_timestamp" };

  const provided = fromHex(signature.replace(/^sha256=/, ""));
  if (!provided) return { ok: false, reason: "bad_signature" };

  // subtle.verify compares in constant time.
  const key = await importKey(secret, "verify");
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    provided,
    encoder.encode(`${timestamp}.${body}`),
  );
  return valid ? { ok: true } : { ok: false, reason: "bad_signature" };
}
