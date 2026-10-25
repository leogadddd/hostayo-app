import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The submit row of a form. On a phone it is pinned to the bottom edge of
 * whatever scrolls (the page, above the tab bar, or a drawer), so the way
 * forward is always in reach and its button is full width. On wide screens it
 * is just a row.
 */
export function FormActions({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        // A plain footer with a divider; on a long form it stays put at the
        // bottom edge while the fields scroll under it. Solid, in the color of
        // the card (linen) or the drawer (white) it sits in.
        "max-lg:sticky max-lg:bottom-[var(--sticky-bottom,0px)] max-lg:z-10 max-lg:-mx-4 max-lg:-mb-4 max-lg:mt-2 max-lg:border-t max-lg:border-pine/10 max-lg:bg-linen max-lg:in-[dialog]:bg-surface max-lg:px-4 max-lg:pb-4 max-lg:pt-3 max-lg:shadow-[0_-10px_14px_-10px_rgba(32,58,53,0.12)]",
        "max-lg:[&>a]:w-full max-lg:[&>button]:w-full",
        className,
      )}
    >
      {children}
    </div>
  );
}
