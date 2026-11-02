"use client";

import { Component, type ReactNode } from "react";
import { errorMessage } from "@/lib/errors";
import { ErrorState } from "./states";

type Props = { children: ReactNode };
type State = { error: unknown };

/**
 * Convex's useQuery throws when a query fails (e.g. FORBIDDEN). This
 * catches it for one section of the page and shows an error with a retry,
 * instead of taking down the whole page.
 */
export class QueryBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: unknown): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <ErrorState
          message={errorMessage(this.state.error)}
          onRetry={() => this.setState({ error: null })}
        />
      );
    }
    return this.props.children;
  }
}
