"use client";

import { useAuth } from "@clerk/nextjs";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "@/convex/_generated/api";
import { errorMessage } from "@/lib/errors";

export type CurrentUser = NonNullable<FunctionReturnType<typeof api.users.me>>;

type CurrentUserState = {
  /** True until we know who the user is (or that they're signed out). */
  isLoading: boolean;
  isAuthenticated: boolean;
  user: CurrentUser | null;
  error: string | null;
};

const CurrentUserContext = createContext<CurrentUserState>({
  isLoading: true,
  isAuthenticated: false,
  user: null,
  error: null,
});

/** Creates the Convex user row after sign-in, then subscribes to it. The role is for UI only. */
export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const { isLoading: authLoading, isAuthenticated } = useConvexAuth();
  const { userId: clerkUserId } = useAuth();
  const ensureCurrentUser = useMutation(api.users.ensureCurrentUser);
  // The Clerk user we provisioned for, so switching accounts re-runs the sync.
  const [syncedUserId, setSyncedUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !clerkUserId) return;
    let cancelled = false;
    ensureCurrentUser()
      .then(() => {
        if (!cancelled) {
          setError(null);
          setSyncedUserId(clerkUserId);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(errorMessage(e));
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, clerkUserId, ensureCurrentUser]);

  const synced = isAuthenticated && clerkUserId != null && syncedUserId === clerkUserId;
  const user = useQuery(api.users.me, synced ? {} : "skip");

  const value: CurrentUserState = {
    isLoading:
      authLoading || (isAuthenticated && !error && (!synced || user === undefined)),
    isAuthenticated,
    user: synced ? (user ?? null) : null,
    error,
  };

  return (
    <CurrentUserContext.Provider value={value}>{children}</CurrentUserContext.Provider>
  );
}

export function useCurrentUser(): CurrentUserState {
  return useContext(CurrentUserContext);
}
