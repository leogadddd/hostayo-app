import type { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { SITE_URL } from "@/lib/site";

export function PublicShell({
  children,
  label,
  labelHref,
}: {
  children: ReactNode;
  label?: string;
  labelHref?: string;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <header className="border-b border-pine/10 bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Logo className="h-9 w-36" />
          {label ? (
            labelHref ? (
              <Link
                href={labelHref}
                className="truncate text-sm font-medium text-pine hover:underline"
              >
                {label}
              </Link>
            ) : (
              <span className="truncate text-sm text-ink/55">{label}</span>
            )
          ) : null}
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-pine/10 bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <div className="flex flex-col items-center gap-4 rounded-2xl bg-sage/40 p-6 text-center md:flex-row md:justify-between md:text-left">
            <div>
              <p className="font-display text-lg font-semibold text-pine">
                Running a staycation?
              </p>
              <p className="mt-1 text-sm text-ink/60">
                Bookings, guests and cleaning, all in one calm place.
              </p>
            </div>
            <a
              href={SITE_URL}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-pine px-6 text-sm font-semibold text-white transition-colors hover:bg-pine-soft md:w-auto"
            >
              Run it with Hostayo
              <span aria-hidden>→</span>
            </a>
          </div>
          <div className="mt-6 flex flex-col items-center gap-3 text-xs text-ink/50 sm:flex-row sm:justify-between">
            <span>Hosted with Hostayo</span>
            <span className="flex gap-5">
              <Link href="/terms" className="py-1 hover:text-pine">
                Terms
              </Link>
              <Link href="/privacy" className="py-1 hover:text-pine">
                Privacy
              </Link>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

/** Stand-in for a cover photo until the unit has one. */
export function PhotoPlaceholder({
  src,
  alt,
  className,
  tone = 0,
}: {
  src: string | null;
  alt: string;
  className?: string;
  tone?: number;
}) {
  const gradients = [
    "from-sage via-pine-mist to-sand",
    "from-sand via-cream to-sage",
    "from-pine-mist via-sage to-cream",
  ];
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} className={className} />;
  }
  return (
    <div
      role="img"
      aria-label={alt}
      className={`bg-gradient-to-br ${gradients[tone % gradients.length]} ${className ?? ""}`}
    />
  );
}
