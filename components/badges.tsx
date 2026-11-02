import type { DisplayStatus } from "@/convex/lib/loanStatus";
import { CATEGORY_LABELS, type ToolCategory } from "@/convex/lib/constants";

const STATUS_STYLES: Record<DisplayStatus, string> = {
  requested: "bg-amber-50 text-amber-800 ring-amber-200",
  approved: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  declined: "bg-stone-100 text-stone-600 ring-stone-200",
  returned: "bg-sky-50 text-sky-800 ring-sky-200",
  overdue: "bg-red-50 text-red-800 ring-red-200",
};

const STATUS_LABELS: Record<DisplayStatus, string> = {
  requested: "Requested",
  approved: "Approved",
  declined: "Declined",
  returned: "Returned",
  overdue: "Overdue",
};

const pill =
  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset";

export function StatusBadge({ status }: { status: DisplayStatus }) {
  return (
    <span className={`${pill} ${STATUS_STYLES[status]}`}>{STATUS_LABELS[status]}</span>
  );
}

export function AvailabilityBadge({
  availability,
}: {
  availability: "available" | "on_loan";
}) {
  return availability === "available" ? (
    <span className={`${pill} bg-emerald-50 text-emerald-800 ring-emerald-200`}>
      Available
    </span>
  ) : (
    <span className={`${pill} bg-stone-100 text-stone-600 ring-stone-200`}>On loan</span>
  );
}

export function CategoryBadge({ category }: { category: ToolCategory }) {
  return (
    <span className={`${pill} bg-stone-50 text-stone-700 ring-stone-200`}>
      {CATEGORY_LABELS[category]}
    </span>
  );
}

export function TrustedLenderBadge() {
  return (
    <span
      className={`${pill} bg-violet-50 text-violet-800 ring-violet-200`}
      title="Marked as a Trusted Lender by a LendLoop admin"
    >
      <svg aria-hidden viewBox="0 0 20 20" fill="currentColor" className="mr-1 h-3 w-3">
        <path
          fillRule="evenodd"
          d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.5 7.7l5.9-.9L10 1.5z"
          clipRule="evenodd"
        />
      </svg>
      Trusted Lender
    </span>
  );
}
