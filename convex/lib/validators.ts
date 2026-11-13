import { v } from "convex/values";

// Listed out rather than generated from the arrays, so the literal types survive.

export const roleValidator = v.union(v.literal("admin"), v.literal("user"));

export const categoryValidator = v.union(
  v.literal("power_tools"),
  v.literal("hand_tools"),
  v.literal("garden"),
  v.literal("kitchen"),
  v.literal("camping"),
  v.literal("cleaning"),
  v.literal("other"),
);

export const conditionValidator = v.union(
  v.literal("new"),
  v.literal("good"),
  v.literal("fair"),
  v.literal("worn"),
);

/** Stored loan statuses. "overdue" is derived at read time and never stored. */
export const loanStatusValidator = v.union(
  v.literal("requested"),
  v.literal("approved"),
  v.literal("declined"),
  v.literal("returned"),
  v.literal("cancelled"),
);

export const automationTypeValidator = v.union(
  v.literal("notification"),
  v.literal("reminder"),
  v.literal("error"),
);

export const automationEventNameValidator = v.union(
  v.literal("loan_requested"),
  v.literal("loan_approved"),
  v.literal("loan_declined"),
  v.literal("loan_returned"),
  v.literal("loan_cancelled"),
  v.literal("loan_overdue"),
  v.literal("workflow_failed"),
);

export const automationStatusValidator = v.union(
  v.literal("pending"),
  v.literal("sent"),
  v.literal("failed"),
);
