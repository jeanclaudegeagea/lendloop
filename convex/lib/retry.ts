export const MAX_DELIVERY_ATTEMPTS = 5;

/** 1s, 4s, 16s, 64s: about 1.5 minutes, enough to ride out an n8n restart. */
export function backoffMs(attempt: number): number {
  return 1000 * 4 ** (attempt - 1);
}
