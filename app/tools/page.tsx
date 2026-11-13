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
import { AvailabilityBadge, TrustedLenderBadge } from "@/components/badges";
import { RequestLoanDialog } from "@/components/RequestLoanDialog";
import { RequireUser } from "@/components/RequireUser";
import {
  ArrowRightIcon,
  Avatar,
  CalendarIcon,
  CATEGORY_ICONS,
  CategoryTile,
  PlusIcon,
  SearchIcon,
  TrashIcon,
} from "@/components/ui/icons";
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
        eyebrow="Browse"
        title="Find the right tool"
        description="Everything your neighbors are lending, and whether it's free right now."
      />
      <RequireUser>
        {(user) => (
          // useSearchParams needs a Suspense boundary in the App Router.
          <Suspense fallback={<ListSkeleton rows={6} variant="grid" />}>
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
        <ListSkeleton rows={6} variant="grid" />
      ) : tools.length === 0 ? (
        <EmptyState
          icon={SearchIcon}
          title={
            category
              ? `No ${CATEGORY_LABELS[category].toLowerCase()} listed`
              : "No tools yet"
          }
          description="Check back soon, or list something of your own."
          action={
            <Link href="/listings" className="btn-secondary">
              <PlusIcon />
              List a tool
            </Link>
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
    `flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium whitespace-nowrap ring-1 transition-all ring-inset ${
      selected
        ? "bg-zinc-900 text-white ring-zinc-900 shadow-sm"
        : "bg-white text-zinc-600 ring-zinc-200 hover:text-zinc-900 hover:ring-zinc-300"
    }`;
  return (
    <nav aria-label="Filter by category" className="-mx-4 mb-6 sm:mx-0">
      <ul className="flex [scrollbar-width:none] gap-2 overflow-x-auto px-4 pb-1 sm:flex-wrap sm:px-0">
        <li>
          <Link
            href="/tools"
            className={chip(!active)}
            aria-current={!active ? "page" : undefined}
          >
            All tools
          </Link>
        </li>
        {TOOL_CATEGORIES.map((c) => {
          const Icon = CATEGORY_ICONS[c];
          return (
            <li key={c}>
              <Link
                href={`/tools?category=${c}`}
                className={chip(active === c)}
                aria-current={active === c ? "page" : undefined}
              >
                <Icon className="size-3.5" />
                {CATEGORY_LABELS[c]}
              </Link>
            </li>
          );
        })}
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
  const ownerName = tool.isMine ? "You" : tool.owner.name;

  return (
    <li className="card-interactive group flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <CategoryTile category={tool.category} />
        <AvailabilityBadge availability={tool.availability} />
      </div>

      <h3 className="mt-4 font-semibold tracking-tight text-zinc-900">{tool.name}</h3>
      <p className="mt-0.5 text-sm text-zinc-500">
        {CATEGORY_LABELS[tool.category]} · {CONDITION_LABELS[tool.condition]} condition
      </p>
      {tool.description && (
        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-zinc-600">
          {tool.description}
        </p>
      )}

      {upcoming.length > 0 && (
        <p className="mt-3 flex items-start gap-1.5 text-xs text-zinc-500">
          <CalendarIcon className="mt-px size-3.5 shrink-0 text-zinc-400" />
          <span>
            Booked {upcoming.map((r) => formatRange(r.startDate, r.endDate)).join(", ")}
            {tool.bookedRanges.length > upcoming.length && " …"}
          </span>
        </p>
      )}

      <div className="mt-auto pt-5">
        <div className="flex items-center justify-between gap-3 border-t border-zinc-100 pt-4">
          <div className="flex min-w-0 items-center gap-2">
            <Avatar name={ownerName} />
            <span className="truncate text-sm text-zinc-600">{ownerName}</span>
            {tool.owner.isTrustedLender && <TrustedLenderBadge />}
          </div>
          {tool.isMine ? (
            <Link href="/listings" className="btn-secondary btn-sm">
              Manage
            </Link>
          ) : (
            <button type="button" className="btn-primary btn-sm" onClick={onBorrow}>
              Request
              <ArrowRightIcon />
            </button>
          )}
        </div>
        {isAdmin && (
          <button
            type="button"
            className="btn-ghost btn-sm mt-2 w-full text-red-600 hover:bg-red-50 hover:text-red-700"
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
            <TrashIcon />
            {remove.pending ? "Removing…" : "Remove listing (admin)"}
          </button>
        )}
        <InlineError message={remove.error} />
      </div>
    </li>
  );
}
