"use client";

import type { ReactNode } from "react";
import {
  CaretRight as ChevronRight,
  Minus,
  Plus,
  type PhosphorIcon,
} from "@/components/ui/icons";
import { MOBILE_CARD } from "@/components/app/mobile-ui";
import { cn } from "@/lib/utils";

/** A text field sized for thumbs: 48px tall, 16px text so phones don't zoom in. */
export const FIELD =
  "h-12 w-full rounded-2xl border border-pine/15 bg-surface px-4 text-base text-ink placeholder:text-ink/35 focus:border-pine focus:outline-none focus:ring-2 focus:ring-sage disabled:cursor-not-allowed disabled:opacity-60";

/** A titled soft card; every block of the phone form sits in one. */
export function FormCard({
  title,
  hint,
  action,
  children,
  className,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn(MOBILE_CARD, "p-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-lg leading-tight text-pine">
            {title}
          </h3>
          {hint ? <p className="mt-0.5 text-xs text-ink/55">{hint}</p> : null}
        </div>
        {action}
      </div>
      <div className="mt-3.5">{children}</div>
    </section>
  );
}

/** A field label above its control. */
export function FieldLabel({
  htmlFor,
  children,
  optional,
}: {
  htmlFor?: string;
  children: ReactNode;
  optional?: boolean;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-sm font-semibold text-pine"
    >
      {children}
      {optional ? (
        <span className="font-normal text-ink/45"> · optional</span>
      ) : null}
    </label>
  );
}

/** A whole row you tap to open a picker: icon, what it is, what it is set to. */
export function PickerRow({
  icon: Icon,
  label,
  value,
  sub,
  invalid,
  onClick,
}: {
  icon: PhosphorIcon;
  label: string;
  value: string;
  sub?: string;
  invalid?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      className={cn(
        "flex w-full items-center gap-3.5 rounded-2xl p-3.5 text-left ring-1 transition active:bg-pine-mist",
        invalid ? "bg-clay-mist/40 ring-clay/40" : "bg-surface ring-pine/12",
      )}
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-pine-mist text-pine">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-medium text-ink/55">{label}</span>
        <span
          className={cn(
            "block truncate text-[15px] font-semibold",
            invalid ? "text-clay-deep" : "text-pine",
          )}
        >
          {value}
        </span>
        {sub ? (
          <span className="mt-0.5 block text-xs text-ink/55">{sub}</span>
        ) : null}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-ink/35" aria-hidden />
    </button>
  );
}

export interface ChipOption<T extends string> {
  value: T;
  label: string;
  /** An icon or logo shown before the label. */
  leading?: ReactNode;
  disabled?: boolean;
}

/** Single choice drawn as chips; the selected one is filled. */
export function ChipGroup<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly ChipOption<T>[];
  onChange: (value: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold ring-1 transition-colors disabled:cursor-not-allowed disabled:opacity-40",
              selected
                ? "bg-primary text-white ring-primary"
                : "bg-surface text-pine ring-pine/12 active:bg-pine-mist",
            )}
          >
            {option.leading}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** − 2 + with 48px buttons. */
export function Stepper({
  value,
  onChange,
  min = 1,
  max,
  label,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label: string;
}) {
  const button =
    "flex h-12 w-12 items-center justify-center rounded-full bg-pine-mist text-pine transition active:bg-pine/15 disabled:opacity-35";
  return (
    <div className="flex items-center gap-4" role="group" aria-label={label}>
      <button
        type="button"
        aria-label={`Fewer ${label.toLowerCase()}`}
        className={button}
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
      >
        <Minus className="h-5 w-5" aria-hidden />
      </button>
      <span
        aria-live="polite"
        className="min-w-8 text-center font-display text-2xl tabular-nums text-pine"
      >
        {value}
      </span>
      <button
        type="button"
        aria-label={`More ${label.toLowerCase()}`}
        className={button}
        disabled={max !== undefined && value >= max}
        onClick={() => onChange(value + 1)}
      >
        <Plus className="h-5 w-5" aria-hidden />
      </button>
    </div>
  );
}

/** A switch row: a label and a toggle on the right. */
export function SwitchRow({
  label,
  checked,
  onChange,
  description,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-2xl bg-surface p-3.5 text-left ring-1 ring-pine/12 active:bg-pine-mist"
    >
      <span className="min-w-0">
        <span className="block text-[15px] font-semibold text-pine">
          {label}
        </span>
        {description ? (
          <span className="mt-0.5 block text-xs text-ink/55">
            {description}
          </span>
        ) : null}
      </span>
      <span
        aria-hidden
        className={cn(
          "relative h-7 w-12 shrink-0 rounded-full transition-colors",
          checked ? "bg-primary" : "bg-ink/20",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all",
            checked ? "left-[1.375rem]" : "left-0.5",
          )}
        />
      </span>
    </button>
  );
}
