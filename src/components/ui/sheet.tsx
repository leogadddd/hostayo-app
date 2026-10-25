"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

/**
 * A bottom sheet: it slides up from the bottom of a phone screen and is a
 * centered dialog on wide ones. Controlled by `open`; closing by the backdrop,
 * the close button or Escape calls `onClose`. Its children only render while
 * open, so a list can hold many closed sheets cheaply.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Pinned below the scrolling body, e.g. the Apply button. */
  footer?: ReactNode;
  className?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();

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
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className={cn(
        "bottom-sheet fixed inset-x-0 bottom-0 top-auto m-0 w-full max-w-none overflow-hidden rounded-t-3xl border-0 bg-paper p-0 text-ink shadow-[0_-12px_40px_rgba(22,41,37,0.25)] backdrop:bg-scrim/50",
        "lg:inset-auto lg:left-1/2 lg:top-1/2 lg:w-full lg:max-w-lg lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-3xl",
        className,
      )}
    >
      {open ? (
        <div className="flex max-h-[88dvh] flex-col">
          <div className="flex justify-center pt-2.5 lg:hidden" aria-hidden>
            <span className="h-1.5 w-10 rounded-full bg-ink/15" />
          </div>
          <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-3">
            <h2 id={titleId} className="font-display text-xl text-pine">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-ink/[0.07] text-ink/60 active:bg-ink/15"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4">
            {children}
          </div>
          {footer ? (
            <div className="border-t border-pine/10 bg-surface px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
              {footer}
            </div>
          ) : (
            <div className="pb-[env(safe-area-inset-bottom)]" />
          )}
        </div>
      ) : null}
    </dialog>
  );
}
