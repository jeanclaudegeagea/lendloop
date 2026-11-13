import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { fail } from "./errors";

// Authorization helpers; every public query and mutation starts with one.

type AuthCtx = Pick<QueryCtx, "auth" | "db">;

export async function getCurrentUser(ctx: AuthCtx): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
    .unique();
}

/** Convex verifies the Clerk JWT. The role always comes from the users row. */
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

export function assertToolOwner(user: Doc<"users">, tool: Doc<"tools">): void {
  if (tool.ownerId !== user._id)
    fail("FORBIDDEN", "You can only change your own listings.");
}

export type LoanSide = "borrower" | "lender";

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

export function parseAdminEmails(raw: string | undefined): Set<string> {
  return new Set(
    (raw ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}
