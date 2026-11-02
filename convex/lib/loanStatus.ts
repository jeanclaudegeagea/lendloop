import { LIMITS } from "./constants";
import { daysBetween, isValidDateString } from "./dates";
import { fail } from "./errors";

export type LoanStatus = "requested" | "approved" | "declined" | "returned";
/** What the UI shows. "overdue" is computed, never stored. */
export type DisplayStatus = LoanStatus | "overdue";

/**
 * The only allowed status changes. Declined and returned are final.
 *   requested -> approved | declined
 *   approved  -> returned
 */
const TRANSITIONS: Record<LoanStatus, readonly LoanStatus[]> = {
  requested: ["approved", "declined"],
  approved: ["returned"],
  declined: [],
  returned: [],
};

export function canTransition(from: LoanStatus, to: LoanStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function assertTransition(from: LoanStatus, to: LoanStatus): void {
  if (!canTransition(from, to)) {
    fail("INVALID_TRANSITION", `A ${from} loan can't be marked ${to}.`);
  }
}

/** An approved loan whose end date has passed (and isn't returned) is overdue. */
export function deriveStatus(
  loan: { status: LoanStatus; endDate: string },
  today: string,
): DisplayStatus {
  return loan.status === "approved" && loan.endDate < today ? "overdue" : loan.status;
}

/** Validates a requested date range. All dates are YYYY-MM-DD in UTC. */
export function validateLoanDates(
  startDate: string,
  endDate: string,
  today: string,
): void {
  if (!isValidDateString(startDate) || !isValidDateString(endDate)) {
    fail("INVALID_INPUT", "Dates must be valid calendar dates (YYYY-MM-DD).");
  }
  if (startDate < today) fail("INVALID_INPUT", "The start date can't be in the past.");
  if (startDate > endDate)
    fail("INVALID_INPUT", "The end date must be on or after the start date.");
  // +1 because both ends are inclusive: the 1st to the 1st is a one-day loan.
  if (daysBetween(startDate, endDate) + 1 > LIMITS.maxLoanDays) {
    fail("INVALID_INPUT", `Loans can be at most ${LIMITS.maxLoanDays} days.`);
  }
}
