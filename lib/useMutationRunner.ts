"use client";

import { useCallback, useState } from "react";
import { errorMessage } from "./errors";

export type RunResult<T> = { ok: true; value: T } | { ok: false };

/**
 * Wraps an async call (usually a Convex mutation) with pending and error
 * state, so every button shows a spinner and a readable error the same way.
 * `run` never throws; check `ok` on its result.
 */
export function useMutationRunner<Args extends unknown[], Result>(
  fn: (...args: Args) => Promise<Result>,
) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (...args: Args): Promise<RunResult<Result>> => {
      setPending(true);
      setError(null);
      try {
        return { ok: true, value: await fn(...args) };
      } catch (e) {
        setError(errorMessage(e));
        return { ok: false };
      } finally {
        setPending(false);
      }
    },
    [fn],
  );

  return { run, pending, error };
}
