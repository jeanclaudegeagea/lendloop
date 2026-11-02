"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { LoanCard, type LoanView } from "@/components/LoanCard";
import { RequireUser } from "@/components/RequireUser";
import {
  EmptyState,
  InlineError,
  ListSkeleton,
  PageHeader,
} from "@/components/ui/states";
import { useMutationRunner } from "@/lib/useMutationRunner";

export default function IncomingRequestsPage() {
  return (
    <>
      <PageHeader
        title="Incoming requests"
        description="Requests to borrow your tools."
      />
      <RequireUser>{() => <IncomingList />}</RequireUser>
    </>
  );
}

function IncomingList() {
  const loans = useQuery(api.loans.listIncoming, {});

  if (loans === undefined) return <ListSkeleton />;
  if (loans.length === 0) {
    return (
      <EmptyState
        title="No requests yet"
        description="When a neighbor asks to borrow one of your tools, it shows up here."
      />
    );
  }

  const needsAnswer = loans.filter((l) => l.status === "requested");
  const active = loans.filter((l) => l.status === "approved" || l.status === "overdue");
  const history = loans.filter((l) => l.status === "declined" || l.status === "returned");

  return (
    <div className="space-y-8">
      <LoanSection
        title="Needs your answer"
        loans={needsAnswer}
        empty="Nothing waiting on you."
      />
      <LoanSection
        title="Lent out"
        loans={active}
        empty="None of your tools are out right now."
      />
      <LoanSection title="History" loans={history} empty="No finished loans yet." />
    </div>
  );
}

function LoanSection({
  title,
  loans,
  empty,
}: {
  title: string;
  loans: LoanView[];
  empty: string;
}) {
  return (
    <section aria-label={title}>
      <h2 className="mb-3 text-sm font-semibold tracking-wide text-stone-500 uppercase">
        {title} <span className="font-normal">({loans.length})</span>
      </h2>
      {loans.length === 0 ? (
        <p className="text-sm text-stone-500">{empty}</p>
      ) : (
        <ul className="space-y-3">
          {loans.map((loan) => (
            <LoanCard
              key={loan._id}
              loan={loan}
              people={`Requested by ${loan.borrowerName ?? "a neighbor"}`}
              actions={<LenderActions loan={loan} />}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

/** Buttons depend on status; the server checks each transition again. */
function LenderActions({ loan }: { loan: LoanView }) {
  const approve = useMutationRunner(useMutation(api.loans.approve));
  const decline = useMutationRunner(useMutation(api.loans.decline));
  const markReturned = useMutationRunner(useMutation(api.loans.markReturned));
  const busy = approve.pending || decline.pending || markReturned.pending;
  const error = approve.error ?? decline.error ?? markReturned.error;

  if (loan.status === "requested") {
    return (
      <div className="flex flex-col items-end">
        <div className="flex gap-2">
          <button
            type="button"
            className="btn-primary"
            disabled={busy}
            onClick={() => void approve.run({ loanId: loan._id })}
          >
            {approve.pending ? "Approving…" : "Approve"}
          </button>
          <button
            type="button"
            className="btn-secondary"
            disabled={busy}
            onClick={() => void decline.run({ loanId: loan._id })}
          >
            {decline.pending ? "Declining…" : "Decline"}
          </button>
        </div>
        <InlineError message={error} />
      </div>
    );
  }
  if (loan.status === "approved" || loan.status === "overdue") {
    return (
      <div className="flex flex-col items-end">
        <button
          type="button"
          className="btn-secondary"
          disabled={busy}
          onClick={() => void markReturned.run({ loanId: loan._id })}
        >
          {markReturned.pending ? "Saving…" : "Mark returned"}
        </button>
        <InlineError message={error} />
      </div>
    );
  }
  return null;
}
