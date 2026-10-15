"use client";

import { useCallback, useId, useRef, useState, type ReactNode } from "react";
import { Info } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { useAnchoredPopover } from "./use-anchored-popover";

/**
 * The home for all helper text: a small info badge that shows the explanation
 * in a tooltip on hover, focus or tap. Put it beside a label or heading
 * instead of writing a hint paragraph.
 */
export function InfoTip({
  children,
  label = "More information",
  className,
}: {
  children: ReactNode;
  /** Accessible name for the badge button. */
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLSpanElement>(null);
  const tipId = useId();
  const close = useCallback(() => setOpen(false), []);

  useAnchoredPopover({
    open,
    onClose: close,
    wrapperRef,
    triggerRef,
    popoverRef,
  });

  return (
    <span
      ref={wrapperRef}
      className={cn("relative inline-flex align-middle", className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={close}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-describedby={open ? tipId : undefined}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        onFocus={() => setOpen(true)}
        onBlur={close}
        onKeyDown={(event) => {
          if (event.key === "Escape") close();
        }}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full text-pine/45 transition-colors hover:text-pine focus-visible:text-pine focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage"
      >
        <Info className="h-4 w-4" aria-hidden />
      </button>
      <span
        ref={popoverRef}
        id={tipId}
        popover="manual"
        role="tooltip"
        className="fixed inset-auto m-0 w-max max-w-[min(20rem,calc(100vw-1rem))] rounded-lg border border-pine/15 bg-surface px-3 py-2 text-xs font-normal leading-relaxed text-ink shadow-xl"
      >
        {children}
      </span>
    </span>
  );
}
