"use client";

import { Component, type ReactNode } from "react";
import { errorMessage } from "@/lib/errors";
import { ErrorState } from "./states";

type Props = { children: ReactNode };
type State = { error: unknown };

/** useQuery throws on failure (e.g. FORBIDDEN); this contains it to one section. */
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
