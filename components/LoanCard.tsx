import type { FunctionReturnType } from "convex/server";
import type { ReactNode } from "react";
import type { api } from "@/convex/_generated/api";
import { CATEGORY_LABELS } from "@/convex/lib/constants";
import { ActivityList } from "@/components/ActivityList";
import { StatusBadge } from "@/components/badges";
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
    <li className="card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-medium">{loan.tool.name}</h3>
            <StatusBadge status={loan.status} />
            {!loan.tool.isActive && (
              <span className="text-xs text-stone-500">(listing removed)</span>
            )}
          </div>
          <p className="mt-1 text-sm text-stone-600">
            {formatRange(loan.startDate, loan.endDate)}
            {loan.tool.category && <> · {CATEGORY_LABELS[loan.tool.category]}</>}
          </p>
          <p className="mt-0.5 text-sm text-stone-500">{people}</p>
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      <ActivityList activity={loan.activity} />
    </li>
  );
}
