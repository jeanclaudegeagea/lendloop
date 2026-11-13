import type { ComponentType, ReactNode } from "react";
import { AlertIcon, BoxIcon, RefreshIcon } from "./icons";

/** Placeholder cards shown while a list loads. */
export function ListSkeleton({
  rows = 3,
  variant = "list",
}: {
  rows?: number;
  variant?: "list" | "grid";
}) {
  return (
    <ul
      aria-busy="true"
      aria-label="Loading"
      className={
        variant === "grid" ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3" : "space-y-3"
      }
    >
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="card animate-pulse">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-zinc-100" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-2/5 rounded-full bg-zinc-200/80" />
              <div className="h-3 w-3/5 rounded-full bg-zinc-100" />
            </div>
          </div>
          {variant === "grid" && (
            <div className="mt-5 h-8 w-full rounded-lg bg-zinc-100" />
          )}
        </li>
      ))}
    </ul>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon: Icon = BoxIcon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ComponentType<{ className?: string }>;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-14 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-zinc-50 text-zinc-400 ring-1 ring-zinc-200/80">
        <Icon className="size-6" />
      </div>
      <p className="mt-4 font-semibold text-zinc-900">{title}</p>
      {description && (
        <p className="mx-auto mt-1 max-w-sm text-sm text-zinc-500">{description}</p>
      )}
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="rounded-2xl border border-red-200/80 bg-red-50/60 px-6 py-10 text-center"
    >
      <div className="mx-auto flex size-11 items-center justify-center rounded-2xl bg-white text-red-500 ring-1 ring-red-200">
        <AlertIcon className="size-5" />
      </div>
      <p className="mt-3 font-semibold text-red-800">Couldn&apos;t load this</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-red-700">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-secondary mt-5">
          <RefreshIcon />
          Try again
        </button>
      )}
    </div>
  );
}

/** Inline error under a form or button. */
export function InlineError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-2 flex items-start gap-1.5 text-sm text-red-600">
      <AlertIcon className="mt-0.5 size-4 shrink-0" />
      {message}
    </p>
  );
}

export function PageHeader({
  title,
  description,
  action,
  eyebrow,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="eyebrow text-brand-700 mb-2">{eyebrow}</p>}
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 max-w-2xl text-[15px] text-zinc-500">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

/** Small heading above a group of cards, with an optional count. */
export function SectionHeading({
  id,
  title,
  count,
  action,
}: {
  id?: string;
  title: string;
  count?: number;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2
        id={id}
        className="flex items-center gap-2 text-base font-semibold text-zinc-900"
      >
        {title}
        {count !== undefined && (
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-zinc-100 px-1.5 text-xs font-medium text-zinc-600 tabular-nums">
            {count}
          </span>
        )}
      </h2>
      {action}
    </div>
  );
}
