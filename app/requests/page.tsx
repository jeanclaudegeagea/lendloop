"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import { LoanCard } from "@/components/LoanCard";
import { RequireUser } from "@/components/RequireUser";
import { EmptyState, ListSkeleton, PageHeader } from "@/components/ui/states";

export default function MyRequestsPage() {
  return (
    <>
      <PageHeader title="My requests" description="Tools you've asked to borrow." />
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
        title="No requests yet"
        description="Find something you need and ask to borrow it."
        action={
          <Link href="/tools" className="btn-primary">
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
          actions={
            loan.status === "overdue" ? (
              <p className="text-sm font-medium text-red-700">
                Please return this to {loan.lenderName ?? "the owner"}.
              </p>
            ) : undefined
          }
        />
      ))}
    </ul>
  );
}
