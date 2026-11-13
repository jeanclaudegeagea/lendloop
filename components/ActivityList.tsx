import type { FunctionReturnType } from "convex/server";
import type { api } from "@/convex/_generated/api";
import { timeAgo } from "@/lib/format";

type Activity = FunctionReturnType<
  typeof api.loans.listIncoming
>[number]["activity"][number];

const EVENT_LABELS: Record<Activity["event"], string> = {
  loan_requested: "Request",
  loan_approved: "Approval",
  loan_declined: "Decline",
  loan_returned: "Return",
  loan_overdue: "Overdue reminder",
  workflow_failed: "Automation",
};

/** Turns an automation event into a sentence like "Reminder sent 2 days ago". */
export function describeActivity(a: Activity): {
  text: string;
  tone: "ok" | "pending" | "error";
} {
  const ago = timeAgo(a.updatedAt);
  const label = EVENT_LABELS[a.event];

  if (a.type === "error") return { text: `Automation error ${ago}`, tone: "error" };
  if (a.type === "reminder") {
    return a.status === "sent"
      ? { text: `Overdue reminder sent ${ago}`, tone: "ok" }
      : { text: `Overdue reminder failed ${ago}`, tone: "error" };
  }
  switch (a.status) {
    case "sent":
      return { text: `${label} notification sent ${ago}`, tone: "ok" };
    case "failed":
      return {
        text: `${label} notification failed after ${a.attempts} attempt${a.attempts === 1 ? "" : "s"}`,
        tone: "error",
      };
    case "pending":
      return a.attempts > 0
        ? {
            text: `${label} notification retrying (attempt ${a.attempts} failed)`,
            tone: "pending",
          }
        : { text: `Sending ${label.toLowerCase()} notification…`, tone: "pending" };
  }
}

const DOT: Record<"ok" | "pending" | "error", string> = {
  ok: "bg-brand-500 ring-brand-100",
  pending: "bg-amber-400 ring-amber-100 animate-pulse",
  error: "bg-red-500 ring-red-100",
};

/** Recent n8n activity for one loan (bonus requirement). */
export function ActivityList({ activity }: { activity: Activity[] }) {
  if (activity.length === 0) return null;
  return (
    <div className="mt-4 rounded-lg bg-zinc-50/80 px-3.5 py-3 ring-1 ring-zinc-100 ring-inset">
      <p className="eyebrow text-[10px]">Automation</p>
      <ul className="mt-2 space-y-1.5">
        {activity.map((a) => {
          const { text, tone } = describeActivity(a);
          return (
            <li
              key={a._id}
              className={`flex items-center gap-2.5 text-xs ${
                tone === "error" ? "text-red-700" : "text-zinc-600"
              }`}
              title={a.lastError ?? a.message ?? undefined}
            >
              <span
                aria-hidden
                className={`size-1.5 shrink-0 rounded-full ring-4 ${DOT[tone]}`}
              />
              {text}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
