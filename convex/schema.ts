import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  automationEventNameValidator,
  automationStatusValidator,
  automationTypeValidator,
  categoryValidator,
  conditionValidator,
  loanStatusValidator,
  roleValidator,
} from "./lib/validators";

// Every document gets `_id` and `_creationTime` from Convex automatically,
// so there are no separate `createdAt` fields.
//
// Dates for loans are "YYYY-MM-DD" strings (UTC calendar days): loans are
// whole days, the strings compare correctly with < and >, and there are no
// timezone off-by-one surprises.

export default defineSchema({
  users: defineTable({
    clerkId: v.string(), // JWT `subject`
    name: v.string(),
    email: v.string(),
    // Server-side only: set on first sign-in from ADMIN_EMAILS, or changed
    // later with the internal `admin:setRole` mutation. Never sent by the client.
    role: roleValidator,
    isTrustedLender: v.boolean(),
  })
    .index("by_clerkId", ["clerkId"])
    .index("by_email", ["email"]),

  tools: defineTable({
    ownerId: v.id("users"),
    name: v.string(),
    category: categoryValidator,
    condition: conditionValidator,
    description: v.string(),
    // Soft delete keeps loan history readable after a listing is removed.
    isActive: v.boolean(),
  })
    .index("by_owner_active", ["ownerId", "isActive"])
    .index("by_active_category", ["isActive", "category"]),

  loans: defineTable({
    toolId: v.id("tools"),
    borrowerId: v.id("users"),
    // Copied from the tool so lender-side lookups need no join.
    lenderId: v.id("users"),
    startDate: v.string(),
    endDate: v.string(),
    status: loanStatusValidator,
    decidedAt: v.optional(v.number()),
    returnedAt: v.optional(v.number()),
  })
    .index("by_tool_status", ["toolId", "status"])
    .index("by_borrower", ["borrowerId"])
    .index("by_lender", ["lenderId"])
    .index("by_status_endDate", ["status", "endDate"]),

  automationEvents: defineTable({
    // Optional because an n8n failure isn't always tied to a loan.
    loanId: v.optional(v.id("loans")),
    type: automationTypeValidator,
    event: automationEventNameValidator,
    status: automationStatusValidator,
    // Unique per logical event; checked before every insert so retries
    // from n8n or the Convex scheduler never create duplicates.
    idempotencyKey: v.string(),
    attempts: v.number(),
    message: v.optional(v.string()),
    lastError: v.optional(v.string()),
    updatedAt: v.number(),
  })
    .index("by_idempotencyKey", ["idempotencyKey"])
    .index("by_loan", ["loanId"]),
});
