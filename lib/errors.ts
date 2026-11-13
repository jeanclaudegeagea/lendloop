import { ConvexError } from "convex/values";

/** Our fail() messages are shown as-is; anything unexpected stays generic. */
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
