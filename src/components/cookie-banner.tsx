"use client";

import Link from "next/link";
import { useState } from "react";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";
import { writeConsent, type CookieConsent } from "@/lib/cookie-consent";
import { applyThemePreference, parseThemePreference } from "@/lib/theme";

/** Asks once. `answered` comes from the server so a returning visitor never sees a flash. */
export function CookieBanner({ answered }: { answered: boolean }) {
  const [open, setOpen] = useState(!answered);
  if (!open) return null;

  function choose(consent: CookieConsent) {
    writeConsent(consent);
    // Re-save (or clear) the theme cookie to match the new choice.
    applyThemePreference(parseThemePreference(document.documentElement.dataset.theme));
    setOpen(false);
  }

  return (
    <div
      role="region"
      aria-label="Cookie preferences"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-xl rounded-2xl border border-pine/15 bg-card p-5 shadow-2xl sm:left-6 sm:mx-0 sm:max-w-sm print:hidden"
    >
      <div className="flex items-start gap-3">
        <Cookie className="mt-0.5 h-5 w-5 shrink-0 text-pine" aria-hidden />
        <div>
          <p className="text-sm font-semibold text-pine">We use a few cookies</p>
          <p className="mt-1 text-sm leading-relaxed text-ink/70">
            Essential cookies keep you signed in. With your OK, we also remember preferences like your theme and use Google Analytics to see how Hostayo is used.{" "}
            <Link href="/cookies" className="font-medium text-pine underline underline-offset-4 hover:text-pine-soft">
              Cookie Policy
            </Link>
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" size="sm" onClick={() => choose("essential")}>
          Essential only
        </Button>
        <Button type="button" size="sm" onClick={() => choose("all")}>
          Accept all
        </Button>
      </div>
    </div>
  );
}
