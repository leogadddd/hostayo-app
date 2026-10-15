"use client";

import { useRef } from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A number field with − and + buttons and an input you can type into, so a
 * value can be set in one go instead of by many clicks. It's an ordinary
 * uncontrolled field: `name` and `defaultValue` work like a plain input, and
 * the buttons dispatch a real `input` event so form-level listeners notice.
 */
export function NumberStepper({
  min = 0,
  max = 99,
  step = 1,
  defaultValue,
  className,
  id,
  name,
  required,
  "aria-label": ariaLabel,
}: {
  min?: number;
  max?: number;
  step?: number;
  defaultValue?: number | string;
  className?: string;
  id?: string;
  name?: string;
  required?: boolean;
  "aria-label"?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const decimals = String(step).split(".")[1]?.length ?? 0;
  const format = (n: number) => String(Number(n.toFixed(decimals)));
  const clamp = (n: number) => Math.min(max, Math.max(min, n));

  const current = () => {
    const parsed = Number(input.current?.value.replace(",", "."));
    return Number.isFinite(parsed) && input.current?.value.trim() !== ""
      ? parsed
      : null;
  };

  const write = (n: number) => {
    const element = input.current;
    if (!element) return;
    element.value = format(clamp(n));
    element.dispatchEvent(new Event("input", { bubbles: true }));
  };

  const nudge = (direction: 1 | -1) => {
    // Move to the next step beyond what's typed, so a typed 2.3 goes to 2.5
    // (or 2) rather than 3.3.
    const base = current() ?? min;
    const units = base / step;
    const next =
      direction === 1
        ? (Math.floor(units + 1e-9) + 1) * step
        : (Math.ceil(units - 1e-9) - 1) * step;
    write(next);
  };

  const button =
    "grid w-10 shrink-0 place-items-center text-pine transition-colors hover:bg-pine-mist/70 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-clay ";

  return (
    <div
      className={cn(
        "flex h-10 w-full overflow-hidden rounded-lg border border-pine/20 bg-surface",
        "focus-within:border-pine focus-within:ring-2 focus-within:ring-sage",
        className,
      )}
    >
      <button
        type="button"
        className={cn(button, "border-r border-pine/15")}
        aria-label="Decrease"
        onClick={() => nudge(-1)}
      >
        <Minus className="h-4 w-4" aria-hidden />
      </button>
      <input
        ref={input}
        id={id}
        name={name}
        required={required}
        aria-label={ariaLabel}
        type="text"
        inputMode={decimals ? "decimal" : "numeric"}
        autoComplete="off"
        defaultValue={defaultValue}
        className="min-w-0 flex-1 bg-transparent text-center text-sm tabular-nums focus:outline-none"
        onKeyDown={(event) => {
          if (event.key === "ArrowUp") {
            event.preventDefault();
            nudge(1);
          } else if (event.key === "ArrowDown") {
            event.preventDefault();
            nudge(-1);
          }
        }}
        onChange={(event) => {
          // Only digits (and a decimal point where steps allow one).
          const allowed = decimals ? /[^0-9.,]/g : /[^0-9]/g;
          const cleaned = event.target.value.replace(allowed, "");
          if (cleaned !== event.target.value) event.target.value = cleaned;
        }}
        onBlur={(event) => {
          const parsed = Number(event.target.value.replace(",", "."));
          const fallback = Number(defaultValue) || min;
          const next =
            Number.isFinite(parsed) && event.target.value.trim() !== ""
              ? parsed
              : fallback;
          const snapped = Math.round(next / step) * step;
          const finalValue = format(clamp(snapped));
          if (event.target.value !== finalValue) {
            event.target.value = finalValue;
            event.target.dispatchEvent(new Event("input", { bubbles: true }));
          }
        }}
        onFocus={(event) => event.target.select()}
      />
      <button
        type="button"
        className={cn(button, "border-l border-pine/15")}
        aria-label="Increase"
        onClick={() => nudge(1)}
      >
        <Plus className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
