import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "@/components/ui/icons";

/**
 * The title bar of a phone form or detail page: a round back button and the
 * title, without the long description the desktop heading carries.
 */
export function MobileBackHeader({
  title,
  subtitle,
  description,
  backHref,
  backLabel = "Back",
  children,
}: {
  title: string;
  subtitle?: string;
  /** A sentence under the title, allowed to wrap. */
  description?: string;
  backHref: string;
  backLabel?: string;
  /** Actions on the right. */
  children?: ReactNode;
}) {
  return (
    <header className="mb-5">
      <div className="flex items-center gap-3">
        <Link
          href={backHref}
          aria-label={backLabel}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface text-pine shadow-[0_2px_10px_rgba(32,58,53,0.08)] ring-1 ring-pine/8 active:bg-pine-mist"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-2xl leading-tight tracking-tight text-pine">
            {title}
          </h1>
          {subtitle ? (
            <p className="truncate text-xs text-ink/55">{subtitle}</p>
          ) : null}
        </div>
        {children}
      </div>
      {description ? (
        <p className="mt-3 px-1 text-sm leading-relaxed text-ink/65">
          {description}
        </p>
      ) : null}
    </header>
  );
}
