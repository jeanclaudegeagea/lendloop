import { ConvexError } from "convex/values";

export type ErrorCode =
  | "UNAUTHENTICATED"
  | "USER_NOT_FOUND"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "INVALID_INPUT"
  | "CONFLICT"
  | "INVALID_TRANSITION";

export type AppErrorData = { code: ErrorCode; message: string };

/**
 * Throws a ConvexError. Unlike a plain Error, its data reaches the client
 * intact, so the UI can show `message` and tests can assert on `code`.
 */
export function fail(code: ErrorCode, message: string): never {
  throw new ConvexError<AppErrorData>({ code, message });
}
