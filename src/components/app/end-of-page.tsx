"use client";

import { ArrowUp, CheckCircle } from "@/components/ui/icons";

/**
 * The quiet last line of a long phone page, with a way back to the top.
 * The app scrolls inside `#main-content`, not the window.
 */
export function EndOfPage() {
  return (
    <div className="mt-12 flex flex-col items-center text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-sage/50 text-pine">
        <CheckCircle className="h-5 w-5" aria-hidden />
      </span>
      <p className="mt-3 text-sm font-semibold text-pine">
        You’ve reached the end of this page
      </p>
      <button
        type="button"
        onClick={() =>
          document
            .getElementById("main-content")
            ?.scrollTo({ top: 0, behavior: "smooth" })
        }
        className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-clay-mist px-4 py-2 text-xs font-semibold text-clay-deep active:opacity-80"
      >
        <ArrowUp className="h-3.5 w-3.5" aria-hidden />
        Back to top
      </button>
    </div>
  );
}
