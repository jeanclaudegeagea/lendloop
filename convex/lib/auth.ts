import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { fail } from "./errors";

// Authorization helpers. Every public query and mutation goes through one of
// these, so the rules live in one place and are enforced on the server no
// matter what the UI does.

/** Anything with `auth` and a readable `db`: both QueryCtx and MutationCtx fit. */
type AuthCtx = Pick<QueryCtx, "auth" | "db">;

/** The caller's user row, or null if signed out or not provisioned yet. */
export async function getCurrentUser(ctx: AuthCtx): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
    .unique();
}

/**
 * Checks the Clerk JWT (Convex validates the signature), then loads the
 * caller's row. The role comes from that row, never from the request.
 */
export async function requireUser(ctx: AuthCtx): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) fail("UNAUTHENTICATED", "You need to sign in.");
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
    .unique();
  if (!user) fail("USER_NOT_FOUND", "Your account isn't set up yet. Refresh the page.");
  return user;
}

export async function requireAdmin(ctx: AuthCtx): Promise<Doc<"users">> {
  const user = await requireUser(ctx);
  if (user.role !== "admin") fail("FORBIDDEN", "Only admins can do this.");
  return user;
}

/** The pure checks below take documents, which keeps them easy to unit test. */

export function assertToolOwner(user: Doc<"users">, tool: Doc<"tools">): void {
  if (tool.ownerId !== user._id)
    fail("FORBIDDEN", "You can only change your own listings.");
}

export type LoanSide = "borrower" | "lender";

/**
 * Checks that the user is on the loan. With `side`, they must be on that
 * specific side (e.g. only the lender may approve).
 */
export function assertLoanParticipant(
  user: Doc<"users">,
  loan: Doc<"loans">,
  side?: LoanSide,
): void {
  const isBorrower = loan.borrowerId === user._id;
  const isLender = loan.lenderId === user._id;
  const allowed =
    side === "borrower"
      ? isBorrower
      : side === "lender"
        ? isLender
        : isBorrower || isLender;
  if (!allowed) {
    fail(
      "FORBIDDEN",
      side === "lender"
        ? "Only the tool's owner can do this."
        : side === "borrower"
          ? "Only the borrower can do this."
          : "You aren't part of this loan.",
    );
  }
}

/** Parses the ADMIN_EMAILS env var ("a@x.com, b@y.com") into a lowercase set. */
export function parseAdminEmails(raw: string | undefined): Set<string> {
  return new Set(
    (raw ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}
