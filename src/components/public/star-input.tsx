"use client";

import { useState } from "react";
import { Star } from "@/components/ui/icons";

/**
 * A 1–5 star picker that submits as a plain radio group under `name`. With
 * `labels`, the word for the star under the pointer (or the chosen one) shows
 * beside the stars.
 */
export function StarInput({
  name,
  label,
  required,
  size = "h-8 w-8",
  labels,
}: {
  name: string;
  label: string;
  required?: boolean;
  size?: string;
  labels?: readonly [string, string, string, string, string];
}) {
  const [value, setValue] = useState(0);
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <fieldset className="min-w-0" onMouseLeave={() => setHover(0)}>
      <legend className="sr-only">{label}</legend>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <label
              key={n}
              className="cursor-pointer rounded p-0.5 text-amber-500 transition-transform focus-within:ring-2 focus-within:ring-sage hover:scale-110"
              onMouseEnter={() => setHover(n)}
            >
              <input
                type="radio"
                name={name}
                value={n}
                required={required && n === 1}
                checked={value === n}
                onChange={() => setValue(n)}
                className="sr-only"
              />
              <span className="sr-only">
                {n} {n === 1 ? "star" : "stars"}
              </span>
              <Star
                aria-hidden
                weight={n <= shown ? "fill" : "regular"}
                className={size}
              />
            </label>
          ))}
        </div>
        {labels ? (
          <span
            className="min-h-6 text-sm font-medium text-pine"
            aria-live="polite"
          >
            {shown ? labels[shown - 1] : ""}
          </span>
        ) : null}
      </div>
    </fieldset>
  );
}
