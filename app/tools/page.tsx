"use client";

import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { api } from "@/convex/_generated/api";
import {
  CATEGORY_LABELS,
  CONDITION_LABELS,
  TOOL_CATEGORIES,
  type ToolCategory,
} from "@/convex/lib/constants";
import {
  AvailabilityBadge,
  CategoryBadge,
  TrustedLenderBadge,
} from "@/components/badges";
import { RequestLoanDialog } from "@/components/RequestLoanDialog";
import { RequireUser } from "@/components/RequireUser";
import {
  EmptyState,
  InlineError,
  ListSkeleton,
  PageHeader,
} from "@/components/ui/states";
import { formatRange } from "@/lib/format";
import { useMutationRunner } from "@/lib/useMutationRunner";

type Tool = FunctionReturnType<typeof api.tools.listAll>[number];

export default function ToolsPage() {
  return (
    <>
      <PageHeader
        title="Browse tools"
        description="Everything your neighbors are lending, and whether it's free right now."
      />
      <RequireUser>
        {(user) => (
          // useSearchParams needs a Suspense boundary in the App Router.
          <Suspense fallback={<ListSkeleton />}>
            <ToolBrowser isAdmin={user.role === "admin"} />
          </Suspense>
        )}
      </RequireUser>
    </>
  );
}

function parseCategory(value: string | null): ToolCategory | undefined {
  return TOOL_CATEGORIES.find((c) => c === value);
}

function ToolBrowser({ isAdmin }: { isAdmin: boolean }) {
  const category = parseCategory(useSearchParams().get("category"));
  const tools = useQuery(api.tools.listAll, category ? { category } : {});
  const [borrowing, setBorrowing] = useState<Tool | null>(null);

  return (
    <>
      <CategoryFilter active={category} />
      {tools === undefined ? (
        <ListSkeleton rows={4} />
      ) : tools.length === 0 ? (
        <EmptyState
          title={
            category
              ? `No ${CATEGORY_LABELS[category].toLowerCase()} listed`
              : "No tools yet"
          }
          description="Check back soon, or list something of your own."
          action={
            <Link href="/listings" className="btn-secondary">
              List a tool
            </Link>
          }
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {tools.map((tool) => (
            <ToolCard
              key={tool._id}
              tool={tool}
              isAdmin={isAdmin}
              onBorrow={() => setBorrowing(tool)}
            />
          ))}
        </ul>
      )}
      {borrowing && (
        <RequestLoanDialog tool={borrowing} onClose={() => setBorrowing(null)} />
      )}
    </>
  );
}

function CategoryFilter({ active }: { active: ToolCategory | undefined }) {
  const chip = (selected: boolean) =>
    `rounded-full px-3 py-1 text-sm ring-1 ring-inset transition-colors ${
      selected
        ? "bg-emerald-700 text-white ring-emerald-700"
        : "bg-white text-stone-700 ring-stone-300 hover:bg-stone-100"
    }`;
  return (
    <nav aria-label="Filter by category" className="mb-5">
      <ul className="flex flex-wrap gap-2">
        <li>
          <Link
            href="/tools"
            className={chip(!active)}
            aria-current={!active ? "page" : undefined}
          >
            All
          </Link>
        </li>
        {TOOL_CATEGORIES.map((c) => (
          <li key={c}>
            <Link
              href={`/tools?category=${c}`}
              className={chip(active === c)}
              aria-current={active === c ? "page" : undefined}
            >
              {CATEGORY_LABELS[c]}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function ToolCard({
  tool,
  isAdmin,
  onBorrow,
}: {
  tool: Tool;
  isAdmin: boolean;
  onBorrow: () => void;
}) {
  const remove = useMutationRunner(useMutation(api.admin.removeTool));
  const upcoming = tool.bookedRanges.slice(0, 2);

  return (
    <li className="card flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-medium">{tool.name}</h3>
        <AvailabilityBadge availability={tool.availability} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <CategoryBadge category={tool.category} />
        <span className="text-xs text-stone-500">
          Condition: {CONDITION_LABELS[tool.condition]}
        </span>
      </div>
      {tool.description && (
        <p className="mt-2 text-sm text-stone-600">{tool.description}</p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-stone-500">
        <span>Lent by {tool.isMine ? "you" : tool.owner.name}</span>
        {tool.owner.isTrustedLender && <TrustedLenderBadge />}
      </div>
      {upcoming.length > 0 && (
        <p className="mt-1 text-xs text-stone-500">
          Booked: {upcoming.map((r) => formatRange(r.startDate, r.endDate)).join(", ")}
          {tool.bookedRanges.length > upcoming.length && " …"}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2 pt-1">
        {tool.isMine ? (
          <Link href="/listings" className="btn-secondary">
            Manage listing
          </Link>
        ) : (
          <button type="button" className="btn-primary" onClick={onBorrow}>
            Request to borrow
          </button>
        )}
        {isAdmin && (
          <button
            type="button"
            className="btn-danger"
            disabled={remove.pending}
            onClick={() => {
              if (
                window.confirm(
                  `Remove "${tool.name}" for everyone? Pending requests will be declined.`,
                )
              ) {
                void remove.run({ toolId: tool._id });
              }
            }}
          >
            {remove.pending ? "Removing…" : "Remove (admin)"}
          </button>
        )}
      </div>
      <InlineError message={remove.error} />
    </li>
  );
}
