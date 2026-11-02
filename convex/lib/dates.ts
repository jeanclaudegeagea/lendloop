// Loans use whole UTC calendar days stored as "YYYY-MM-DD". Strings in this
// format compare correctly with < and >, so no Date math is needed for ranges.

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Today's date in UTC as "YYYY-MM-DD". */
export function todayUTC(now: number = Date.now()): string {
  return new Date(now).toISOString().slice(0, 10);
}

/** True for a real calendar date in YYYY-MM-DD form (rejects "2026-02-30"). */
export function isValidDateString(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/** Whole days from `from` to `to` (both YYYY-MM-DD). Negative if `to` is earlier. */
export function daysBetween(from: string, to: string): number {
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS,
  );
}

/** Inclusive ranges: a loan ending on the 5th overlaps one starting on the 5th. */
export function rangesOverlap(
  a: { startDate: string; endDate: string },
  b: { startDate: string; endDate: string },
): boolean {
  return a.startDate <= b.endDate && b.startDate <= a.endDate;
}
