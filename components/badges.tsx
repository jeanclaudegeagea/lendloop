import type { DisplayStatus } from "@/convex/lib/loanStatus";

const STATUS_STYLES: Record<DisplayStatus, { pill: string; dot: string }> = {
  requested: {
    pill: "bg-amber-50 text-amber-800 ring-amber-200/80",
    dot: "bg-amber-500",
  },
  approved: { pill: "bg-brand-50 text-brand-800 ring-brand-200/80", dot: "bg-brand-500" },
  declined: { pill: "bg-zinc-100 text-zinc-600 ring-zinc-200", dot: "bg-zinc-400" },
  returned: { pill: "bg-sky-50 text-sky-800 ring-sky-200/80", dot: "bg-sky-500" },
  overdue: { pill: "bg-red-50 text-red-700 ring-red-200/80", dot: "bg-red-500" },
  cancelled: { pill: "bg-zinc-100 text-zinc-600 ring-zinc-200", dot: "bg-zinc-400" },
};

const STATUS_LABELS: Record<DisplayStatus, string> = {
  requested: "Requested",
  approved: "Approved",
  declined: "Declined",
  returned: "Returned",
  overdue: "Overdue",
  cancelled: "Cancelled",
};

const pill =
  "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset";

export function StatusBadge({ status }: { status: DisplayStatus }) {
  const s = STATUS_STYLES[status];
  return (
    <span className={`${pill} ${s.pill}`}>
      <span
        aria-hidden
        className={`size-1.5 rounded-full ${s.dot} ${status === "overdue" ? "animate-pulse" : ""}`}
      />
      {STATUS_LABELS[status]}
    </span>
  );
}

export function AvailabilityBadge({
  availability,
}: {
  availability: "available" | "on_loan";
}) {
  return availability === "available" ? (
    <span className={`${pill} bg-brand-50 text-brand-800 ring-brand-200/80`}>
      <span aria-hidden className="relative flex size-1.5">
        <span className="bg-brand-400 absolute inline-flex size-full animate-ping rounded-full opacity-60" />
        <span className="bg-brand-500 relative inline-flex size-1.5 rounded-full" />
      </span>
      Available
    </span>
  ) : (
    <span className={`${pill} bg-zinc-100 text-zinc-600 ring-zinc-200`}>
      <span aria-hidden className="size-1.5 rounded-full bg-zinc-400" />
      On loan
    </span>
  );
}

export function TrustedLenderBadge() {
  return (
    <span
      className={`${pill} bg-violet-50 text-violet-700 ring-violet-200/80`}
      title="Marked as a Trusted Lender by a LendLoop admin"
    >
      <svg aria-hidden viewBox="0 0 20 20" fill="currentColor" className="size-3">
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
