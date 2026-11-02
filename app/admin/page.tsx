"use client";

import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";
import { TrustedLenderBadge } from "@/components/badges";
import { LoanCard } from "@/components/LoanCard";
import { RequireUser } from "@/components/RequireUser";
import {
  EmptyState,
  InlineError,
  ListSkeleton,
  PageHeader,
} from "@/components/ui/states";
import { useMutationRunner } from "@/lib/useMutationRunner";

type AdminUser = FunctionReturnType<typeof api.admin.listUsers>[number];

export default function AdminPage() {
  return (
    <>
      <PageHeader
        title="Admin"
        description="Mark Trusted Lenders and see every loan. Remove listings from Browse tools."
      />
      <RequireUser adminOnly>
        {() => (
          <div className="space-y-10">
            <section aria-labelledby="users-heading">
              <h2 id="users-heading" className="mb-3 text-lg font-semibold">
                Lenders
              </h2>
              <UserTable />
            </section>
            <section aria-labelledby="loans-heading">
              <h2 id="loans-heading" className="mb-3 text-lg font-semibold">
                All loans
              </h2>
              <AllLoans />
            </section>
          </div>
        )}
      </RequireUser>
    </>
  );
}

function UserTable() {
  const users = useQuery(api.admin.listUsers, {});
  if (users === undefined) return <ListSkeleton rows={2} />;
  if (users.length === 0) return <EmptyState title="No users yet" />;
  return (
    <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-stone-200 bg-stone-50 text-xs text-stone-500 uppercase">
          <tr>
            <th scope="col" className="px-4 py-2 font-medium">
              Name
            </th>
            <th scope="col" className="px-4 py-2 font-medium">
              Email
            </th>
            <th scope="col" className="px-4 py-2 font-medium">
              Role
            </th>
            <th scope="col" className="px-4 py-2 font-medium">
              Listings
            </th>
            <th scope="col" className="px-4 py-2 font-medium">
              Trusted Lender
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {users.map((u) => (
            <UserRow key={u._id} user={u} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UserRow({ user }: { user: AdminUser }) {
  const setTrusted = useMutationRunner(useMutation(api.admin.setTrustedLender));
  return (
    <tr>
      <td className="px-4 py-2">
        <span className="flex flex-wrap items-center gap-2">
          {user.name}
          {user.isTrustedLender && <TrustedLenderBadge />}
        </span>
      </td>
      <td className="px-4 py-2 text-stone-600">{user.email}</td>
      <td className="px-4 py-2 text-stone-600">{user.role}</td>
      <td className="px-4 py-2 text-stone-600">{user.activeListings}</td>
      <td className="px-4 py-2">
        <button
          type="button"
          className="btn-secondary px-3 py-1"
          disabled={setTrusted.pending}
          aria-pressed={user.isTrustedLender}
          onClick={() =>
            void setTrusted.run({
              userId: user._id,
              isTrustedLender: !user.isTrustedLender,
            })
          }
        >
          {user.isTrustedLender ? "Remove badge" : "Mark trusted"}
        </button>
        <InlineError message={setTrusted.error} />
      </td>
    </tr>
  );
}

function AllLoans() {
  const loans = useQuery(api.admin.listAllLoans, {});
  if (loans === undefined) return <ListSkeleton />;
  if (loans.length === 0) return <EmptyState title="No loans yet" />;
  return (
    <ul className="space-y-3">
      {loans.map((loan) => (
        <LoanCard
          key={loan._id}
          loan={loan}
          people={`${loan.borrowerName ?? "?"} borrowing from ${loan.lenderName ?? "?"}`}
        />
      ))}
    </ul>
  );
}
