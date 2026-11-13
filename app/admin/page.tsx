"use client";

import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import type { ComponentType } from "react";
import { api } from "@/convex/_generated/api";
import { TrustedLenderBadge } from "@/components/badges";
import { LoanCard } from "@/components/LoanCard";
import { RequireUser } from "@/components/RequireUser";
import {
  AlertIcon,
  Avatar,
  HandshakeIcon,
  SendIcon,
  UsersIcon,
} from "@/components/ui/icons";
import {
  EmptyState,
  InlineError,
  ListSkeleton,
  PageHeader,
  SectionHeading,
} from "@/components/ui/states";
import { useMutationRunner } from "@/lib/useMutationRunner";

type AdminUser = FunctionReturnType<typeof api.admin.listUsers>[number];

export default function AdminPage() {
  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Dashboard"
        description="Mark Trusted Lenders and see every loan. Remove listings from Browse tools."
      />
      <RequireUser adminOnly>
        {() => (
          <div className="space-y-12">
            <Overview />
            <section aria-labelledby="users-heading">
              <UserTable />
            </section>
            <section aria-labelledby="loans-heading">
              <AllLoans />
            </section>
          </div>
        )}
      </RequireUser>
    </>
  );
}

function Overview() {
  const users = useQuery(api.admin.listUsers, {});
  const loans = useQuery(api.admin.listAllLoans, {});

  const stats: {
    label: string;
    value: number | undefined;
    Icon: ComponentType<{ className?: string }>;
    tone: string;
  }[] = [
    {
      label: "Members",
      value: users?.length,
      Icon: UsersIcon,
      tone: "bg-sky-50 text-sky-600 ring-sky-200/70",
    },
    {
      label: "Pending requests",
      value: loans?.filter((l) => l.status === "requested").length,
      Icon: SendIcon,
      tone: "bg-amber-50 text-amber-600 ring-amber-200/70",
    },
    {
      label: "Active loans",
      value: loans?.filter((l) => l.status === "approved" || l.status === "overdue")
        .length,
      Icon: HandshakeIcon,
      tone: "bg-brand-50 text-brand-700 ring-brand-200/70",
    },
    {
      label: "Overdue",
      value: loans?.filter((l) => l.status === "overdue").length,
      Icon: AlertIcon,
      tone: "bg-red-50 text-red-600 ring-red-200/70",
    },
  ];

  return (
    <section aria-label="Overview">
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(({ label, value, Icon, tone }) => (
          <div key={label} className="card p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <dt className="text-sm font-medium text-zinc-500">{label}</dt>
              <span
                aria-hidden
                className={`flex size-8 items-center justify-center rounded-lg ring-1 ring-inset ${tone}`}
              >
                <Icon className="size-4" />
              </span>
            </div>
            <dd className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950 tabular-nums">
              {value ?? (
                <span className="inline-block h-8 w-10 animate-pulse rounded-md bg-zinc-100" />
              )}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function UserTable() {
  const users = useQuery(api.admin.listUsers, {});
  return (
    <>
      <SectionHeading id="users-heading" title="Members" count={users?.length} />
      {users === undefined ? (
        <ListSkeleton rows={2} />
      ) : users.length === 0 ? (
        <EmptyState icon={UsersIcon} title="No users yet" />
      ) : (
        <div className="shadow-card overflow-x-auto rounded-xl border border-zinc-200/80 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200/80 bg-zinc-50/80">
              <tr className="text-xs text-zinc-500">
                <th scope="col" className="px-5 py-3 font-medium">
                  Name
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  Email
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  Role
                </th>
                <th scope="col" className="px-5 py-3 text-right font-medium">
                  Listings
                </th>
                <th scope="col" className="px-5 py-3 text-right font-medium">
                  Trusted Lender
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {users.map((u) => (
                <UserRow key={u._id} user={u} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function UserRow({ user }: { user: AdminUser }) {
  const setTrusted = useMutationRunner(useMutation(api.admin.setTrustedLender));
  return (
    <tr className="transition-colors hover:bg-zinc-50/60">
      <td className="px-5 py-3.5">
        <span className="flex flex-wrap items-center gap-2.5">
          <Avatar name={user.name} size="md" />
          <span className="font-medium text-zinc-900">{user.name}</span>
          {user.isTrustedLender && <TrustedLenderBadge />}
        </span>
      </td>
      <td className="px-5 py-3.5 text-zinc-500">{user.email}</td>
      <td className="px-5 py-3.5">
        <span
          className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${
            user.role === "admin"
              ? "bg-zinc-900 text-white ring-zinc-900"
              : "bg-white text-zinc-600 ring-zinc-200"
          }`}
        >
          {user.role}
        </span>
      </td>
      <td className="px-5 py-3.5 text-right text-zinc-600 tabular-nums">
        {user.activeListings}
      </td>
      <td className="px-5 py-3.5 text-right">
        <button
          type="button"
          className={user.isTrustedLender ? "btn-secondary btn-sm" : "btn-primary btn-sm"}
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
  return (
    <>
      <SectionHeading id="loans-heading" title="All loans" count={loans?.length} />
      {loans === undefined ? (
        <ListSkeleton />
      ) : loans.length === 0 ? (
        <EmptyState icon={HandshakeIcon} title="No loans yet" />
      ) : (
        <ul className="space-y-3">
          {loans.map((loan) => (
            <LoanCard
              key={loan._id}
              loan={loan}
              people={`${loan.borrowerName ?? "?"} borrowing from ${loan.lenderName ?? "?"}`}
            />
          ))}
        </ul>
      )}
    </>
  );
}
