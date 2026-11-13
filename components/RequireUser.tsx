"use client";

import { SignInButton } from "@clerk/nextjs";
import type { ReactNode } from "react";
import {
  useCurrentUser,
  type CurrentUser,
} from "@/components/providers/CurrentUserProvider";
import { QueryBoundary } from "@/components/ui/QueryBoundary";
import { LockIcon, ShieldIcon } from "@/components/ui/icons";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/states";

/** `adminOnly` is UX only; admin functions check the role on the server. */
export function RequireUser({
  children,
  adminOnly = false,
}: {
  children: (user: CurrentUser) => ReactNode;
  adminOnly?: boolean;
}) {
  const { isLoading, isAuthenticated, user, error } = useCurrentUser();

  if (error)
    return <ErrorState message={error} onRetry={() => window.location.reload()} />;
  if (isLoading) return <ListSkeleton />;
  if (!isAuthenticated || !user) {
    return (
      <EmptyState
        icon={LockIcon}
        title="Sign in to continue"
        description="You need an account to lend or borrow tools."
        action={
          <SignInButton mode="modal">
            <button type="button" className="btn-primary">
              Sign in to lend or borrow
            </button>
          </SignInButton>
        }
      />
    );
  }
  if (adminOnly && user.role !== "admin") {
    return (
      <EmptyState
        icon={ShieldIcon}
        title="Admins only"
        description="You don't have access to this page."
      />
    );
  }
  return <QueryBoundary>{children(user)}</QueryBoundary>;
}
