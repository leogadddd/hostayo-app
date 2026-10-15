"use client";

import { useEffect, useId, useRef } from "react";
import { Warning as AlertTriangle, X } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";

/**
 * A confirmation you open from state (`open`), for actions that start from
 * something other than a single button, like a bulk delete. It looks like
 * ConfirmationDialog, which wraps its own trigger button instead.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Keep",
  pending = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  pending?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        event.preventDefault();
        if (!pending) onClose();
      }}
      onClose={() => {
        if (open) onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !pending) onClose();
      }}
      className="fixed left-1/2 top-1/2 m-0 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-pine/15 bg-linen p-0 text-ink shadow-2xl backdrop:bg-scrim/55"
    >
      <div className="flex items-start gap-4 p-6">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-clay-mist text-clay-deep">
          <AlertTriangle className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="font-display text-xl text-pine">
            {title}
          </h2>
          <p
            id={descriptionId}
            className="mt-2 text-sm leading-relaxed text-ink/65"
          >
            {description}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={pending}
          aria-label="Close confirmation"
          className="rounded-md p-1.5 text-ink/45 hover:bg-pine-mist hover:text-pine disabled:opacity-50"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <div className="flex flex-col-reverse gap-2 border-t border-pine/10 bg-paper/70 px-6 py-4 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="ghost"
          onClick={onClose}
          disabled={pending}
        >
          {cancelLabel}
        </Button>
        <Button
          type="button"
          variant="clay"
          onClick={onConfirm}
          disabled={pending}
        >
          {pending ? "Deleting…" : confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}
