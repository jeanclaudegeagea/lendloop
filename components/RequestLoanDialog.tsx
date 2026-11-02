"use client";

import { useMutation } from "convex/react";
import { useState, type FormEvent } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { LIMITS } from "@/convex/lib/constants";
import { rangesOverlap, todayUTC } from "@/convex/lib/dates";
import { InlineError } from "@/components/ui/states";
import { Modal } from "@/components/ui/Modal";
import { formatRange } from "@/lib/format";
import { useMutationRunner } from "@/lib/useMutationRunner";

type Range = { startDate: string; endDate: string };

/**
 * Date-range picker for a borrow request. Booked ranges are shown so people
 * pick free dates; the server checks overlap again either way.
 */
export function RequestLoanDialog({
  tool,
  onClose,
}: {
  tool: { _id: Id<"tools">; name: string; bookedRanges: Range[] };
  onClose: () => void;
}) {
  const today = todayUTC();
  const [range, setRange] = useState<Range>({ startDate: today, endDate: today });
  const [done, setDone] = useState(false);
  const request = useMutationRunner(useMutation(api.loans.request));

  const clientError =
    range.startDate < today
      ? "The start date can't be in the past."
      : range.endDate < range.startDate
        ? "The end date must be on or after the start date."
        : tool.bookedRanges.some((b) => rangesOverlap(b, range))
          ? "Those dates overlap an existing booking."
          : null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (clientError) return;
    if ((await request.run({ toolId: tool._id, ...range })).ok) setDone(true);
  }

  return (
    <Modal title={`Borrow: ${tool.name}`} onClose={onClose}>
      {done ? (
        <div className="space-y-4">
          <p className="text-sm text-stone-700">
            Request sent for{" "}
            <strong>{formatRange(range.startDate, range.endDate)}</strong>. The owner has
            been notified, and you can follow it under <em>My requests</em>.
          </p>
          <div className="flex justify-end">
            <button type="button" className="btn-primary" onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="loan-start" className="label">
                From
              </label>
              <input
                id="loan-start"
                type="date"
                className="input"
                min={today}
                value={range.startDate}
                required
                onChange={(e) =>
                  setRange((r) => ({
                    startDate: e.target.value,
                    endDate: r.endDate < e.target.value ? e.target.value : r.endDate,
                  }))
                }
              />
            </div>
            <div>
              <label htmlFor="loan-end" className="label">
                To (inclusive)
              </label>
              <input
                id="loan-end"
                type="date"
                className="input"
                min={range.startDate}
                value={range.endDate}
                required
                onChange={(e) => setRange((r) => ({ ...r, endDate: e.target.value }))}
              />
            </div>
          </div>

          <p className="text-xs text-stone-500">
            Up to {LIMITS.maxLoanDays} days. Dates are in UTC.
          </p>

          {tool.bookedRanges.length > 0 && (
            <div className="rounded-md bg-stone-50 p-3 text-sm">
              <p className="font-medium text-stone-700">Already booked</p>
              <ul className="mt-1 list-inside list-disc text-stone-600">
                {tool.bookedRanges.map((b) => (
                  <li key={`${b.startDate}-${b.endDate}`}>
                    {formatRange(b.startDate, b.endDate)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <InlineError message={clientError ?? request.error} />

          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={request.pending || clientError !== null}
            >
              {request.pending ? "Sending…" : "Send request"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
