"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { XIcon } from "./icons";

/**
 * A modal built on the native <dialog> element, which gives focus trapping,
 * Esc to close and a backdrop for free. Mount it only while it should be
 * open; it opens itself on mount.
 */
export function Modal({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="modal-title"
      className="animate-pop-in shadow-pop backdrop:animate-fade-in m-auto w-[min(32rem,calc(100%-2rem))] overflow-visible rounded-2xl border border-zinc-200/80 bg-white p-0 backdrop:bg-black/50 backdrop:backdrop-blur-[2px]"
    >
      <div className="flex items-start justify-between gap-4 px-6 pt-6">
        <div>
          <h2 id="modal-title" className="text-lg font-semibold tracking-tight">
            {title}
          </h2>
          {description && <p className="mt-1 text-sm text-zinc-500">{description}</p>}
        </div>
        <button
          type="button"
          onClick={() => ref.current?.close()}
          aria-label="Close"
          className="-mt-1 -mr-2 rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
        >
          <XIcon className="size-5" />
        </button>
      </div>
      <div className="px-6 pt-5 pb-6">{children}</div>
    </dialog>
  );
}

/** Footer row for modal forms: actions on the right, separated by a hairline. */
export function ModalActions({ children }: { children: ReactNode }) {
  return (
    <div className="-mx-6 mt-6 -mb-6 flex justify-end gap-2 rounded-b-2xl border-t border-zinc-100 bg-zinc-50/70 px-6 py-4">
      {children}
    </div>
  );
}
