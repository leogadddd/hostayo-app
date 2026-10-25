"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Bed,
  CalendarCheck,
  CalendarDots,
  Check,
  Clock,
  DotsThree,
  PencilSimple,
  Plus,
  Prohibit,
  SignOut,
  Warning,
  X,
} from "@/components/ui/icons";
import { cn } from "@/lib/utils";

const ICONS = {
  plus: Plus,
  availability: CalendarCheck,
  calendar: CalendarDots,
  check: Check,
  checkIn: Bed,
  checkOut: SignOut,
  edit: PencilSimple,
  clock: Clock,
  cancel: Prohibit,
  warning: Warning,
} as const;

export type FabAction = {
  href: string;
  label: string;
  icon: keyof typeof ICONS;
  /** Destructive actions read in clay instead of pine. */
  tone?: "danger";
};

const FAB_CLASS =
  "flex h-14 w-14 items-center justify-center rounded-full bg-clay text-white shadow-[0_8px_24px_rgba(140,63,44,0.4)] transition active:scale-95";

/**
 * The phone's floating action button, bottom right above the tab bar. One
 * action is a plain link; several open a small menu above it.
 */
export function MobileFab({
  actions,
  label = "Quick actions",
  trigger = "plus",
}: {
  actions: readonly FabAction[];
  label?: string;
  /** The button's icon while the menu is closed. */
  trigger?: "plus" | "dots";
}) {
  const TriggerIcon = trigger === "dots" ? DotsThree : Plus;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (actions.length === 0) return null;
  const position =
    "fixed right-4 z-30 bottom-[calc(4rem+env(safe-area-inset-bottom)+1rem)] sm:right-6";

  if (actions.length === 1) {
    const [action] = actions;
    const Icon = ICONS[action!.icon];
    return (
      <Link
        href={action!.href}
        aria-label={action!.label}
        className={cn(position, FAB_CLASS)}
      >
        <Icon className="h-6 w-6" aria-hidden />
      </Link>
    );
  }

  return (
    <>
      {open ? (
        <div
          aria-hidden
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-20 bg-scrim/35"
        />
      ) : null}
      <div className={cn(position, "flex flex-col items-end gap-3")}>
        {open ? (
          <ul className="flex flex-col items-end gap-2.5" aria-label={label}>
            {actions.map((action) => {
              const Icon = ICONS[action.icon];
              return (
                <li key={action.href}>
                  <Link
                    href={action.href}
                    onClick={() => setOpen(false)}
                    className="flex h-12 items-center gap-2.5 rounded-full bg-surface pl-4 pr-5 text-sm font-semibold text-pine shadow-[0_6px_20px_rgba(32,58,53,0.25)] active:bg-pine-mist"
                  >
                    <Icon
                      className={cn(
                        "h-5 w-5",
                        action.tone === "danger" ? "text-red-700" : "text-clay",
                      )}
                      aria-hidden
                    />
                    {action.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : null}
        <button
          type="button"
          aria-label={label}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className={FAB_CLASS}
        >
          {open ? (
            <X className="h-6 w-6" aria-hidden />
          ) : (
            <TriggerIcon className="h-6 w-6" aria-hidden />
          )}
        </button>
      </div>
    </>
  );
}
