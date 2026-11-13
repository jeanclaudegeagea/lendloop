import { describe, expect, it } from "vitest";
import { isValidDateString, rangesOverlap, todayUTC } from "./dates";
import {
  assertTransition,
  canTransition,
  deriveStatus,
  validateLoanDates,
  type LoanStatus,
} from "./loanStatus";

describe("loan status transitions", () => {
  const allowed: [LoanStatus, LoanStatus][] = [
    ["requested", "approved"],
    ["requested", "declined"],
    ["requested", "cancelled"],
    ["approved", "returned"],
  ];

  it.each(allowed)("allows %s -> %s", (from, to) => {
    expect(canTransition(from, to)).toBe(true);
  });

  it.each([
    ["requested", "returned"], // can't return something never lent
    ["approved", "declined"], // can't decline after approving
    ["approved", "approved"],
    ["declined", "approved"], // final state
    ["returned", "approved"], // final state
    ["returned", "requested"],
    ["approved", "cancelled"], // too late to cancel once approved
    ["cancelled", "approved"], // final state
  ] as [LoanStatus, LoanStatus][])("rejects %s -> %s", (from, to) => {
    expect(canTransition(from, to)).toBe(false);
    expect(() => assertTransition(from, to)).toThrow(/can't be marked/);
  });
});

describe("deriveStatus", () => {
  const today = "2026-06-10";

  it("marks an approved loan past its end date as overdue", () => {
    expect(deriveStatus({ status: "approved", endDate: "2026-06-09" }, today)).toBe(
      "overdue",
    );
  });

  it("is not overdue on the end date itself", () => {
    expect(deriveStatus({ status: "approved", endDate: today }, today)).toBe("approved");
  });

  it("never marks a returned or declined loan overdue", () => {
    expect(deriveStatus({ status: "returned", endDate: "2026-01-01" }, today)).toBe(
      "returned",
    );
    expect(deriveStatus({ status: "declined", endDate: "2026-01-01" }, today)).toBe(
      "declined",
    );
  });
});

describe("validateLoanDates", () => {
  const today = "2026-06-10";

  it("accepts a same-day loan starting today", () => {
    expect(() => validateLoanDates(today, today, today)).not.toThrow();
  });

  it("rejects a start date in the past", () => {
    expect(() => validateLoanDates("2026-06-09", "2026-06-12", today)).toThrow(/past/);
  });

  it("rejects an end date before the start date", () => {
    expect(() => validateLoanDates("2026-06-12", "2026-06-11", today)).toThrow(
      /on or after/,
    );
  });

  it("rejects impossible calendar dates", () => {
    expect(() => validateLoanDates("2026-02-30", "2026-03-01", "2026-01-01")).toThrow(
      /valid calendar dates/,
    );
  });

  it("rejects loans longer than the maximum", () => {
    expect(() => validateLoanDates("2026-06-10", "2026-07-10", today)).toThrow(/at most/);
  });
});

describe("date helpers", () => {
  it("treats ranges as inclusive", () => {
    const a = { startDate: "2026-06-01", endDate: "2026-06-05" };
    expect(rangesOverlap(a, { startDate: "2026-06-05", endDate: "2026-06-07" })).toBe(
      true,
    );
    expect(rangesOverlap(a, { startDate: "2026-06-06", endDate: "2026-06-07" })).toBe(
      false,
    );
  });

  it("formats today in UTC", () => {
    expect(todayUTC(Date.UTC(2026, 0, 31, 23, 59))).toBe("2026-01-31");
  });

  it("validates YYYY-MM-DD strings", () => {
    expect(isValidDateString("2026-12-31")).toBe(true);
    expect(isValidDateString("2026-13-01")).toBe(false);
    expect(isValidDateString("31/12/2026")).toBe(false);
  });
});
