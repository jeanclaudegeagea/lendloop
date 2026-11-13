"use client";

import { SignInButton } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import { CATEGORY_LABELS } from "@/convex/lib/constants";
import { useCurrentUser } from "@/components/providers/CurrentUserProvider";
import { QueryBoundary } from "@/components/ui/QueryBoundary";
import {
  ArrowRightIcon,
  BoxIcon,
  CalendarIcon,
  CategoryTile,
  HandshakeIcon,
  SearchIcon,
} from "@/components/ui/icons";
import { EmptyState, ListSkeleton, SectionHeading } from "@/components/ui/states";

const STEPS = [
  {
    Icon: BoxIcon,
    title: "List what you own",
    body: "Add the drill, ladder or tent that sits in your garage most of the year.",
  },
  {
    Icon: CalendarIcon,
    title: "Request the dates",
    body: "Neighbors pick free days on the calendar and send a request in seconds.",
  },
  {
    Icon: HandshakeIcon,
    title: "Lend and get it back",
    body: "Approve, hand it over, and get automatic reminders if it's running late.",
  },
];

export default function HomePage() {
  const { isAuthenticated, isLoading } = useCurrentUser();

  return (
    <div className="space-y-20 sm:space-y-24">
      <section className="relative -mx-4 -mt-8 overflow-hidden px-4 pt-16 pb-6 sm:-mx-6 sm:-mt-10 sm:px-6 sm:pt-24">
        <div aria-hidden className="bg-grid absolute inset-0 -z-10" />
        <div
          aria-hidden
          className="absolute top-0 left-1/2 -z-10 h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,var(--color-brand-100),transparent)] opacity-80 blur-2xl"
        />

        <div className="mx-auto max-w-3xl text-center">
          <span className="shadow-card inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white/80 px-3 py-1 text-xs font-medium text-zinc-600 backdrop-blur">
            <span className="bg-brand-500 size-1.5 rounded-full" />
            The neighborhood tool library
          </span>
          <h1 className="mt-6 text-4xl font-semibold tracking-[-0.035em] text-balance text-zinc-950 sm:text-6xl">
            Borrow what you need.
            <br />
            <span className="from-brand-600 bg-gradient-to-r to-teal-500 bg-clip-text text-transparent">
              Lend what you don&apos;t.
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-pretty text-zinc-500 sm:text-lg">
            LendLoop connects you with neighbors who have the tools you need, so nobody
            has to buy a pressure washer for one afternoon.
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            {isLoading ? (
              <div
                className="h-11 w-56 animate-pulse rounded-xl bg-zinc-200"
                aria-hidden
              />
            ) : isAuthenticated ? (
              <>
                <Link href="/tools" className="btn-primary btn-lg">
                  <SearchIcon />
                  Browse tools
                </Link>
                <Link href="/listings" className="btn-secondary btn-lg">
                  List a tool
                </Link>
              </>
            ) : (
              <>
                <SignInButton mode="modal">
                  <button type="button" className="btn-primary btn-lg">
                    Get started
                    <ArrowRightIcon />
                  </button>
                </SignInButton>
                <a href="#available-heading" className="btn-secondary btn-lg">
                  See what&apos;s available
                </a>
              </>
            )}
          </div>
        </div>
      </section>

      <section aria-labelledby="how-heading">
        <h2 id="how-heading" className="sr-only">
          How it works
        </h2>
        <ol className="grid gap-4 sm:grid-cols-3">
          {STEPS.map(({ Icon, title, body }, i) => (
            <li key={title} className="card relative">
              <div className="flex items-center justify-between">
                <span className="bg-brand-50 text-brand-700 ring-brand-200/70 flex size-10 items-center justify-center rounded-xl ring-1 ring-inset">
                  <Icon className="size-5" />
                </span>
                <span className="font-mono text-xs text-zinc-300">0{i + 1}</span>
              </div>
              <h3 className="mt-4 font-semibold text-zinc-900">{title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-zinc-500">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="available-heading" className="scroll-mt-24">
        <QueryBoundary>
          <PublicToolList signedIn={isAuthenticated} />
        </QueryBoundary>
      </section>
    </div>
  );
}

/** tools.listPublic returns only name and category. */
function PublicToolList({ signedIn }: { signedIn: boolean }) {
  const tools = useQuery(api.tools.listPublic, {});

  return (
    <>
      <SectionHeading
        id="available-heading"
        title="Tools in the neighborhood"
        count={tools?.length}
        action={
          signedIn && tools && tools.length > 0 ? (
            <Link href="/tools" className="btn-ghost btn-sm">
              View all
              <ArrowRightIcon />
            </Link>
          ) : undefined
        }
      />
      {tools === undefined ? (
        <ListSkeleton rows={6} variant="grid" />
      ) : tools.length === 0 ? (
        <EmptyState
          title="No tools listed yet"
          description="Be the first to lend something to your neighbors."
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => (
            <li key={tool._id} className="card-interactive flex items-center gap-3.5 p-4">
              <CategoryTile category={tool.category} />
              <div className="min-w-0">
                <p className="truncate font-medium text-zinc-900">{tool.name}</p>
                <p className="text-sm text-zinc-500">{CATEGORY_LABELS[tool.category]}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
