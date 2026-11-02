"use client";

import { SignInButton } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import { CategoryBadge } from "@/components/badges";
import { useCurrentUser } from "@/components/providers/CurrentUserProvider";
import { QueryBoundary } from "@/components/ui/QueryBoundary";
import { EmptyState, ListSkeleton } from "@/components/ui/states";

export default function HomePage() {
  const { isAuthenticated, isLoading } = useCurrentUser();

  return (
    <div className="space-y-10">
      <section className="py-8 text-center sm:py-12">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">LendLoop</h1>
        <p className="mt-3 text-lg text-stone-600">
          Borrow what you need. Lend what you don&apos;t.
        </p>
        <div className="mt-6 flex justify-center">
          {isLoading ? (
            <div className="h-9 w-56 animate-pulse rounded-md bg-stone-200" aria-hidden />
          ) : isAuthenticated ? (
            <Link href="/tools" className="btn-primary">
              Browse tools
            </Link>
          ) : (
            <SignInButton mode="modal">
              <button type="button" className="btn-primary">
                Sign in to lend or borrow
              </button>
            </SignInButton>
          )}
        </div>
      </section>

      <section aria-labelledby="available-heading">
        <h2 id="available-heading" className="mb-4 text-lg font-semibold">
          Tools in the neighborhood
        </h2>
        <QueryBoundary>
          <PublicToolList />
        </QueryBoundary>
      </section>
    </div>
  );
}

/** Uses tools.listPublic, which returns only name and category, never owner details. */
function PublicToolList() {
  const tools = useQuery(api.tools.listPublic, {});

  if (tools === undefined) return <ListSkeleton rows={4} />;
  if (tools.length === 0) {
    return (
      <EmptyState
        title="No tools listed yet"
        description="Be the first to lend something to your neighbors."
      />
    );
  }
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {tools.map((tool) => (
        <li key={tool._id} className="card flex items-center justify-between gap-3">
          <span className="truncate font-medium">{tool.name}</span>
          <CategoryBadge category={tool.category} />
        </li>
      ))}
    </ul>
  );
}
