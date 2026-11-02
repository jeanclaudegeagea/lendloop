/** How many times Convex tries to deliver one notification to n8n. */
export const MAX_DELIVERY_ATTEMPTS = 5;

/**
 * Exponential backoff before the next attempt: 1s, 4s, 16s, 64s. The whole
 * sequence covers about 1.5 minutes, enough to ride out an n8n restart.
 */
export function backoffMs(attempt: number): number {
  return 1000 * 4 ** (attempt - 1);
}
