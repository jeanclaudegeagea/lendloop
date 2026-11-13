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

/** Unlike a plain Error, ConvexError data reaches the client intact. */
export function fail(code: ErrorCode, message: string): never {
  throw new ConvexError<AppErrorData>({ code, message });
}
