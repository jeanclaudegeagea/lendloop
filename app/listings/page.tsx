"use client";

import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import Link from "next/link";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { CONDITION_LABELS } from "@/convex/lib/constants";
import { AvailabilityBadge, CategoryBadge } from "@/components/badges";
import { RequireUser } from "@/components/RequireUser";
import { ToolForm, type ToolFormValues } from "@/components/ToolForm";
import { Modal } from "@/components/ui/Modal";
import {
  EmptyState,
  InlineError,
  ListSkeleton,
  PageHeader,
} from "@/components/ui/states";
import { useMutationRunner } from "@/lib/useMutationRunner";

type MyTool = FunctionReturnType<typeof api.tools.listMine>[number];

export default function MyListingsPage() {
  const [creating, setCreating] = useState(false);
  return (
    <>
      <PageHeader
        title="My listings"
        description="Tools you're willing to lend."
        action={
          <button type="button" className="btn-primary" onClick={() => setCreating(true)}>
            List a tool
          </button>
        }
      />
      <RequireUser>
        {() => (
          <>
            <MyToolList onCreate={() => setCreating(true)} />
            {creating && <CreateToolModal onClose={() => setCreating(false)} />}
          </>
        )}
      </RequireUser>
    </>
  );
}

function MyToolList({ onCreate }: { onCreate: () => void }) {
  const tools = useQuery(api.tools.listMine, {});
  const [editing, setEditing] = useState<MyTool | null>(null);

  if (tools === undefined) return <ListSkeleton />;
  if (tools.length === 0) {
    return (
      <EmptyState
        title="You haven't listed anything yet"
        description="List a tool you don't use every day and help a neighbor out."
        action={
          <button type="button" className="btn-primary" onClick={onCreate}>
            List your first tool
          </button>
        }
      />
    );
  }
  return (
    <>
      <ul className="space-y-3">
        {tools.map((tool) => (
          <MyToolRow key={tool._id} tool={tool} onEdit={() => setEditing(tool)} />
        ))}
      </ul>
      {editing && <EditToolModal tool={editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function MyToolRow({ tool, onEdit }: { tool: MyTool; onEdit: () => void }) {
  const remove = useMutationRunner(useMutation(api.tools.remove));
  return (
    <li className="card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-medium">{tool.name}</h3>
            <AvailabilityBadge availability={tool.availability} />
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <CategoryBadge category={tool.category} />
            <span className="text-xs text-stone-500">
              Condition: {CONDITION_LABELS[tool.condition]}
            </span>
          </div>
          {tool.description && (
            <p className="mt-2 text-sm text-stone-600">{tool.description}</p>
          )}
          {tool.pendingRequests > 0 && (
            <Link
              href="/incoming"
              className="mt-2 inline-block text-sm font-medium text-amber-700 hover:underline"
            >
              {tool.pendingRequests} pending request
              {tool.pendingRequests === 1 ? "" : "s"} →
            </Link>
          )}
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-secondary" onClick={onEdit}>
            Edit
          </button>
          <button
            type="button"
            className="btn-danger"
            disabled={remove.pending}
            onClick={() => {
              if (
                window.confirm(
                  `Delete "${tool.name}"? Pending requests will be declined.`,
                )
              ) {
                void remove.run({ toolId: tool._id });
              }
            }}
          >
            {remove.pending ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
      <InlineError message={remove.error} />
    </li>
  );
}

function CreateToolModal({ onClose }: { onClose: () => void }) {
  const create = useMutationRunner(useMutation(api.tools.create));
  async function handleSubmit(values: ToolFormValues) {
    if ((await create.run(values)).ok) onClose();
  }
  return (
    <Modal title="List a tool" onClose={onClose}>
      <ToolForm
        submitLabel="List tool"
        pending={create.pending}
        error={create.error}
        onSubmit={handleSubmit}
        onCancel={onClose}
      />
    </Modal>
  );
}

function EditToolModal({ tool, onClose }: { tool: MyTool; onClose: () => void }) {
  const update = useMutationRunner(useMutation(api.tools.update));
  async function handleSubmit(values: ToolFormValues) {
    if ((await update.run({ toolId: tool._id, ...values })).ok) onClose();
  }
  return (
    <Modal title={`Edit ${tool.name}`} onClose={onClose}>
      <ToolForm
        initial={{
          name: tool.name,
          category: tool.category,
          condition: tool.condition,
          description: tool.description,
        }}
        submitLabel="Save changes"
        pending={update.pending}
        error={update.error}
        onSubmit={handleSubmit}
        onCancel={onClose}
      />
    </Modal>
  );
}
