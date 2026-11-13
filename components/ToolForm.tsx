"use client";

import { useState, type FormEvent } from "react";
import {
  CATEGORY_LABELS,
  CONDITION_LABELS,
  LIMITS,
  TOOL_CATEGORIES,
  TOOL_CONDITIONS,
  type ToolCategory,
  type ToolCondition,
} from "@/convex/lib/constants";
import { ModalActions } from "@/components/ui/Modal";
import { InlineError } from "@/components/ui/states";

export type ToolFormValues = {
  name: string;
  category: ToolCategory;
  condition: ToolCondition;
  description: string;
};

const EMPTY: ToolFormValues = {
  name: "",
  category: "power_tools",
  condition: "good",
  description: "",
};

/** Client checks are for quick feedback; the server enforces the same rules. */
export function ToolForm({
  initial = EMPTY,
  submitLabel,
  pending,
  error,
  onSubmit,
  onCancel,
}: {
  initial?: ToolFormValues;
  submitLabel: string;
  pending: boolean;
  error: string | null;
  onSubmit: (values: ToolFormValues) => void;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<ToolFormValues>(initial);
  const nameLength = values.name.trim().length;
  const nameValid = nameLength >= LIMITS.toolNameMin && nameLength <= LIMITS.toolNameMax;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (nameValid) onSubmit(values);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div>
        <label htmlFor="tool-name" className="label">
          Name
        </label>
        <input
          id="tool-name"
          className="input"
          value={values.name}
          maxLength={LIMITS.toolNameMax}
          required
          autoFocus
          onChange={(e) => setValues({ ...values, name: e.target.value })}
          placeholder="e.g. Cordless drill"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="tool-category" className="label">
            Category
          </label>
          <select
            id="tool-category"
            className="input"
            value={values.category}
            onChange={(e) =>
              setValues({ ...values, category: e.target.value as ToolCategory })
            }
          >
            {TOOL_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="tool-condition" className="label">
            Condition
          </label>
          <select
            id="tool-condition"
            className="input"
            value={values.condition}
            onChange={(e) =>
              setValues({ ...values, condition: e.target.value as ToolCondition })
            }
          >
            {TOOL_CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {CONDITION_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="tool-description" className="label">
          Short description <span className="font-normal text-zinc-400">(optional)</span>
        </label>
        <textarea
          id="tool-description"
          className="input min-h-24 resize-y"
          value={values.description}
          maxLength={LIMITS.descriptionMax}
          aria-describedby="tool-description-count"
          onChange={(e) => setValues({ ...values, description: e.target.value })}
          placeholder="Anything a borrower should know"
        />
        <p
          id="tool-description-count"
          className="mt-1.5 text-right text-xs text-zinc-400 tabular-nums"
        >
          {values.description.length}/{LIMITS.descriptionMax}
        </p>
      </div>

      <InlineError message={error} />

      <ModalActions>
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={pending || !nameValid}>
          {pending ? "Saving…" : submitLabel}
        </button>
      </ModalActions>
    </form>
  );
}
