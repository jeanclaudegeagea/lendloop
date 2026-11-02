/// <reference types="vite/client" />
// Shared helpers for convex-test. The file name has two dots, so Convex
// doesn't deploy it as a function module.
import { convexTest } from "convex-test";
import type { UserIdentity } from "convex/server";
import { api } from "./_generated/api";
import schema from "./schema";
import { todayUTC } from "./lib/dates";

// Every Convex module (including _generated), but not the tests themselves.
export const modules = import.meta.glob([
  "./**/*.ts",
  "./_generated/*.js",
  "!./**/*.test.ts",
  "!./test.setup.ts",
]);

export function setup() {
  return convexTest(schema, modules);
}

export type TestConvex = ReturnType<typeof setup>;

export const identities = {
  alice: {
    subject: "user_alice",
    name: "Alice",
    email: "alice@example.com",
    emailVerified: true,
  },
  bob: {
    subject: "user_bob",
    name: "Bob",
    email: "bob@example.com",
    emailVerified: true,
  },
  carol: {
    subject: "user_carol",
    name: "Carol",
    email: "carol@example.com",
    emailVerified: true,
  },
  admin: {
    subject: "user_admin",
    name: "Ada Admin",
    email: "admin@example.com",
    emailVerified: true,
  },
} satisfies Record<string, Partial<UserIdentity>>;

/** Signs in as `identity` and provisions their user row, as the app does on first load. */
export async function signIn(t: TestConvex, identity: Partial<UserIdentity>) {
  const as = t.withIdentity(identity);
  await as.mutation(api.users.ensureCurrentUser, {});
  return as;
}

/** A YYYY-MM-DD date `n` days from today (UTC). */
export function daysFromToday(n: number): string {
  return todayUTC(Date.now() + n * 24 * 60 * 60 * 1000);
}

export const sampleTool = {
  name: "Cordless drill",
  category: "power_tools",
  condition: "good",
  description: "18V with two batteries.",
} as const;
