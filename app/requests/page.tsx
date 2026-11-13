"use client";

import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import { LoanCard, type LoanView } from "@/components/LoanCard";
import { RequireUser } from "@/components/RequireUser";
import { AlertIcon, SearchIcon, SendIcon, XIcon } from "@/components/ui/icons";
import {
  EmptyState,
  InlineError,
  ListSkeleton,
  PageHeader,
} from "@/components/ui/states";
import { useMutationRunner } from "@/lib/useMutationRunner";

export default function MyRequestsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Borrowing"
        title="My requests"
        description="Tools you've asked to borrow, and where each request stands."
      />
      <RequireUser>{() => <MyRequestList />}</RequireUser>
    </>
  );
}

function MyRequestList() {
  const loans = useQuery(api.loans.listMyRequests, {});

  if (loans === undefined) return <ListSkeleton />;
  if (loans.length === 0) {
    return (
      <EmptyState
        icon={SendIcon}
        title="No requests yet"
        description="Find something you need and ask to borrow it."
        action={
          <Link href="/tools" className="btn-primary">
            <SearchIcon />
            Browse tools
          </Link>
        }
      />
    );
  }
  return (
    <ul className="space-y-3">
      {loans.map((loan) => (
        <LoanCard
          key={loan._id}
          loan={loan}
          people={`From ${loan.lenderName ?? "a neighbor"}`}
          actions={<BorrowerActions loan={loan} />}
        />
      ))}
    </ul>
  );
}

function BorrowerActions({ loan }: { loan: LoanView }) {
  const cancel = useMutationRunner(useMutation(api.loans.cancel));

  if (loan.status === "overdue") {
    return (
      <p className="flex items-center gap-1.5 rounded-lg bg-red-50 px-2.5 py-1.5 text-sm font-medium text-red-700">
        <AlertIcon className="size-4" />
        Please return this to {loan.lenderName ?? "the owner"}.
      </p>
    );
  }
  if (loan.status !== "requested") return null;
  return (
    <div className="flex flex-col sm:items-end">
      <button
        type="button"
        className="btn-secondary btn-sm"
        disabled={cancel.pending}
        onClick={() => {
          if (window.confirm(`Cancel your request for "${loan.tool.name}"?`)) {
            void cancel.run({ loanId: loan._id });
          }
        }}
      >
        <XIcon />
        {cancel.pending ? "Cancelling…" : "Cancel request"}
      </button>
      <InlineError message={cancel.error} />
    </div>
  );
}
