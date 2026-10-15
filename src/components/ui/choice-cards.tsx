"use client";

import { useRef, type ComponentType } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { InfoTip } from "./info-tip";

export interface ChoiceCardOption<T extends string> {
  value: T;
  label: string;
  /** Helper text, shown in a tooltip behind an info badge on the card. */
  description?: string;
  icon?: ComponentType<{ className?: string }>;
  /** A brand logo image, shown instead of `icon`. */
  logo?: string;
  disabled?: boolean;
}

/**
 * A radio group drawn as cards: for short lists where seeing every option
 * at once beats a dropdown. Arrow keys move and select, like native radios.
 */
export function ChoiceCards<T extends string>({
  value,
  onChange,
  options,
  columns = 2,
  variant = "row",
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: readonly ChoiceCardOption<T>[];
  /** Columns from the `sm` breakpoint up; phones get two (one for 2-option groups with descriptions), three for five-column tiles. */
  columns?: 2 | 3 | 4 | 5;
  /** `tile`: icon above a short label, for long lists of one-word choices. */
  variant?: "row" | "tile";
  "aria-label"?: string;
  "aria-labelledby"?: string;
  className?: string;
}) {
  const groupRef = useRef<HTMLDivElement>(null);
  const enabled = options.filter((option) => !option.disabled);
  const focusable = enabled.some((option) => option.value === value)
    ? value
    : enabled[0]?.value;

  return (
    <div
      ref={groupRef}
      role="radiogroup"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      className={cn(
        "grid gap-2",
        columns === 2
          ? "sm:grid-cols-2"
          : columns === 3
            ? "grid-cols-2 sm:grid-cols-3"
            : columns === 4
              ? "grid-cols-2 sm:grid-cols-4"
              : "grid-cols-3 sm:grid-cols-5",
        className,
      )}
      onKeyDown={(event) => {
        const step = {
          ArrowRight: 1,
          ArrowDown: 1,
          ArrowLeft: -1,
          ArrowUp: -1,
        }[event.key];
        if (step === undefined || !enabled.length) return;
        event.preventDefault();
        const index = enabled.findIndex((option) => option.value === value);
        const next = enabled[(index + step + enabled.length) % enabled.length]!;
        onChange(next.value);
        requestAnimationFrame(() =>
          groupRef.current
            ?.querySelector<HTMLButtonElement>(`[data-value='${next.value}']`)
            ?.focus(),
        );
      }}
    >
      {options.map((option) => {
        const Icon = option.icon;
        const active = option.value === value;
        return (
          <div key={option.value} className="relative flex min-w-0">
            <button
              type="button"
              role="radio"
              data-value={option.value}
              aria-checked={active}
              disabled={option.disabled}
              tabIndex={option.value === focusable ? 0 : -1}
              onClick={() => onChange(option.value)}
              className={cn(
                "relative flex min-w-0 flex-1 rounded-xl border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay disabled:cursor-not-allowed disabled:opacity-45",
                variant === "tile"
                  ? "flex-col items-center gap-1.5 px-1.5 py-3 text-center"
                  : "items-start gap-3 p-3 text-left",
                active
                  ? "border-clay bg-clay-mist/40 ring-1 ring-clay"
                  : "border-pine/15 bg-surface hover:border-pine/35",
              )}
            >
              {option.logo ? (
                <img
                  src={option.logo}
                  alt=""
                  aria-hidden
                  className="h-9 w-9 shrink-0 rounded-lg"
                />
              ) : Icon ? (
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors",
                    active ? "bg-clay text-white" : "bg-sage/60 text-pine",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
              ) : null}
              <span
                className={cn(
                  "min-w-0",
                  variant === "tile" ? "w-full" : "flex-1 self-center",
                )}
              >
                <span
                  className={cn(
                    "block font-medium text-pine",
                    variant === "tile" ? "truncate text-xs" : "text-sm",
                  )}
                >
                  {option.label}
                </span>
              </span>
              {active ? (
                <Check
                  className={cn(
                    "absolute top-2.5 h-3.5 w-3.5 text-clay-deep",
                    option.description && variant !== "tile"
                      ? "right-8"
                      : "right-2.5",
                  )}
                  aria-hidden
                />
              ) : null}
            </button>
            {option.description ? (
              <span
                className={cn(
                  "absolute z-10",
                  variant === "tile"
                    ? "right-1.5 top-1.5"
                    : "right-2.5 top-2.5",
                )}
              >
                <InfoTip>{option.description}</InfoTip>
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
