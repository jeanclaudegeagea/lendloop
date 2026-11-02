import { ConvexError } from "convex/values";

/**
 * Turns anything thrown by a Convex call into a message safe to show.
 * ConvexErrors from our `fail()` helper carry a user-facing message; anything
 * else is an unexpected server error, and its details stay in the logs.
 */
export function errorMessage(error: unknown): string {
  if (error instanceof ConvexError) {
    const data: unknown = error.data;
    if (typeof data === "object" && data !== null && "message" in data) {
      return String((data as { message: unknown }).message);
    }
    if (typeof data === "string") return data;
  }
  return "Something went wrong. Please try again.";
}
