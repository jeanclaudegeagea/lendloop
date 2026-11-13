import type { FunctionReturnType } from "convex/server";
import type { ReactNode } from "react";
import type { api } from "@/convex/_generated/api";
import { CATEGORY_LABELS } from "@/convex/lib/constants";
import { ActivityList } from "@/components/ActivityList";
import { StatusBadge } from "@/components/badges";
import { BoxIcon, CalendarIcon, CategoryTile, UsersIcon } from "@/components/ui/icons";
import { formatRange } from "@/lib/format";

export type LoanView = FunctionReturnType<typeof api.loans.listIncoming>[number];

/** One loan: tool, dates, the other party, status, actions and automation activity. */
export function LoanCard({
  loan,
  people,
  actions,
}: {
  loan: LoanView;
  /** e.g. "Requested by Bob" or "From Alice". */
  people: string;
  actions?: ReactNode;
}) {
  return (
    <li
      className={`card relative overflow-hidden ${
        loan.status === "overdue" ? "border-red-200 ring-1 ring-red-100" : ""
      }`}
    >
      {loan.status === "overdue" && (
        <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-red-500" />
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex min-w-0 flex-1 gap-4">
          {loan.tool.category ? (
            <CategoryTile category={loan.tool.category} />
          ) : (
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-400">
              <BoxIcon className="size-5" />
            </span>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate font-semibold tracking-tight text-zinc-900">
                {loan.tool.name}
              </h3>
              <StatusBadge status={loan.status} />
              {!loan.tool.isActive && (
                <span className="text-xs text-zinc-400">Listing removed</span>
              )}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-500">
              <span className="flex items-center gap-1.5">
                <CalendarIcon className="size-3.5 text-zinc-400" />
                {formatRange(loan.startDate, loan.endDate)}
              </span>
              <span className="flex items-center gap-1.5">
                <UsersIcon className="size-3.5 text-zinc-400" />
                {people}
              </span>
              {loan.tool.category && (
                <span className="hidden sm:inline">
                  {CATEGORY_LABELS[loan.tool.category]}
                </span>
              )}
            </div>
          </div>
        </div>
        {actions && <div className="flex flex-wrap gap-2 sm:shrink-0">{actions}</div>}
      </div>
      <ActivityList activity={loan.activity} />
    </li>
  );
}
