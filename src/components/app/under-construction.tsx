import type { ReactNode } from "react";
import Link from "next/link";
import { Construction } from "lucide-react";
import { buttonClassName } from "@/components/ui/button";
import { PageHeading } from "./page-heading";

/**
 * Areas temporarily replaced by the under-construction page. The real pages
 * stay in place behind this switch; set an entry to false to bring it back.
 */
export const UNDER_CONSTRUCTION = {
  expenses: false,
  reports: false,
} as const;

export function UnderConstruction({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <PageHeading title={title} />
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-pine/25 bg-surface/60 px-6 py-16 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-sage/70 text-pine">
          <Construction className="h-6 w-6" aria-hidden />
        </span>
        <h2 className="mt-4 font-display text-xl text-pine">
          Under construction
        </h2>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-ink/60">
          {description}
        </p>
        {children}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link href="/dashboard" className={buttonClassName("primary")}>
            Back to dashboard
          </Link>
          <Link href="/settings/support" className={buttonClassName("outline")}>
            Tell us what you need
          </Link>
        </div>
      </div>
    </div>
  );
}
