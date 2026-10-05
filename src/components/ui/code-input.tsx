"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * A 6-digit one-time code drawn as six boxes over one real input, so paste
 * and one-time-code autofill still work.
 */
export function CodeInput({
  value,
  onChange,
  invalid = false,
  disabled = false,
  id,
  label = "6-digit code",
  size = "md",
  autoFocus = true,
}: {
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  disabled?: boolean;
  id?: string;
  label?: string;
  /** `sm` fits a dialog beside an icon. */
  size?: "sm" | "md";
  autoFocus?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(autoFocus);
  return (
    <div
      className="relative mx-auto w-fit"
      onClick={() => input.current?.focus()}
    >
      <div
        className={cn(
          "flex items-center",
          size === "sm" ? "gap-1.5" : "gap-2 sm:gap-2.5",
        )}
        aria-hidden
      >
        {Array.from({ length: 6 }, (_, index) => {
          const active =
            focused && !disabled && index === Math.min(value.length, 5);
          return (
            <span key={index} className="contents">
              {index === 3 ? (
                <span className="mx-0.5 h-0.5 w-3 rounded-full bg-pine/20" />
              ) : null}
              <span
                className={cn(
                  "flex items-center justify-center rounded-xl border-2 bg-white font-mono font-semibold text-[#22312d] transition-colors",
                  size === "sm"
                    ? "h-12 w-10 text-xl"
                    : "h-14 w-11 text-2xl sm:h-16 sm:w-12",
                  invalid
                    ? "border-clay/60"
                    : active
                      ? "border-clay shadow-[0_0_0_4px_color-mix(in_oklab,var(--color-clay)_15%,transparent)]"
                      : value[index]
                        ? "border-pine/30"
                        : "border-pine/12",
                )}
              >
                {value[index] ??
                  (active ? (
                    <span
                      className={cn(
                        "w-0.5 animate-pulse bg-clay",
                        size === "sm" ? "h-5" : "h-6",
                      )}
                    />
                  ) : (
                    ""
                  ))}
              </span>
            </span>
          );
        })}
      </div>
      <input
        ref={input}
        id={id}
        value={value}
        onChange={(event) =>
          onChange(event.target.value.replace(/\D/g, "").slice(0, 6))
        }
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        inputMode="numeric"
        autoComplete="one-time-code"
        aria-label={label}
        aria-invalid={invalid}
        disabled={disabled}
        autoFocus={autoFocus}
        maxLength={6}
        className="absolute inset-0 h-full w-full cursor-text opacity-0"
      />
    </div>
  );
}
