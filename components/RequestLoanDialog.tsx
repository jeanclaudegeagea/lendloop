"use client";

import { useMutation } from "convex/react";
import { useState, type FormEvent } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { LIMITS } from "@/convex/lib/constants";
import { rangesOverlap, todayUTC } from "@/convex/lib/dates";
import { InlineError } from "@/components/ui/states";
import { CalendarIcon, CheckIcon, ClockIcon } from "@/components/ui/icons";
import { Modal, ModalActions } from "@/components/ui/Modal";
import { formatRange } from "@/lib/format";
import { useMutationRunner } from "@/lib/useMutationRunner";

type Range = { startDate: string; endDate: string };

/** Shows booked ranges so people pick free dates; the server re-checks overlap. */
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
    <Modal
      title={done ? "Request sent" : `Borrow ${tool.name}`}
      description={done ? undefined : "Pick the days you'd like to borrow it."}
      onClose={onClose}
    >
      {done ? (
        <div>
          <div className="flex flex-col items-center py-2 text-center">
            <span className="bg-brand-50 text-brand-700 ring-brand-50/50 flex size-12 items-center justify-center rounded-full ring-8">
              <CheckIcon className="size-6" />
            </span>
            <p className="mt-4 text-sm leading-relaxed text-zinc-600">
              You asked for <strong className="text-zinc-900">{tool.name}</strong> on{" "}
              <strong className="text-zinc-900">
                {formatRange(range.startDate, range.endDate)}
              </strong>
              . The owner has been notified, and you can follow it under{" "}
              <em>My requests</em>.
            </p>
          </div>
          <ModalActions>
            <button type="button" className="btn-primary" onClick={onClose}>
              Done
            </button>
          </ModalActions>
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

          <p className="flex items-center gap-1.5 text-xs text-zinc-500">
            <ClockIcon className="size-3.5" />
            Up to {LIMITS.maxLoanDays} days. Dates are in UTC.
          </p>

          {tool.bookedRanges.length > 0 && (
            <div className="rounded-xl border border-zinc-200/80 bg-zinc-50 p-3.5">
              <p className="eyebrow">Already booked</p>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {tool.bookedRanges.map((b) => (
                  <li
                    key={`${b.startDate}-${b.endDate}`}
                    className="inline-flex items-center gap-1.5 rounded-md bg-white px-2 py-1 text-xs font-medium text-zinc-700 ring-1 ring-zinc-200 ring-inset"
                  >
                    <CalendarIcon className="size-3 text-zinc-400" />
                    {formatRange(b.startDate, b.endDate)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <InlineError message={clientError ?? request.error} />

          <ModalActions>
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
          </ModalActions>
        </form>
      )}
    </Modal>
  );
}
