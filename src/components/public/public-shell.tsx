import type { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components/logo";

export function PublicShell({ children, label, labelHref }: { children: ReactNode; label?: string; labelHref?: string }) {
  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <header className="border-b border-pine/10 bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Logo className="h-9 w-36" />
          {label ? (
            labelHref ? (
              <Link href={labelHref} className="truncate text-sm font-medium text-pine hover:underline">{label}</Link>
            ) : (
              <span className="truncate text-sm text-ink/55">{label}</span>
            )
          ) : null}
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-pine/10 bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-xs text-ink/50 sm:px-6">
          <span>Hosted with Hostayo</span>
          <span className="flex gap-4">
            <Link href="/terms" className="hover:text-pine">Terms</Link>
            <Link href="/privacy" className="hover:text-pine">Privacy</Link>
          </span>
        </div>
      </footer>
    </div>
  );
}

/** Stand-in for a cover photo until the unit has one. */
export function PhotoPlaceholder({ src, alt, className, tone = 0 }: { src: string | null; alt: string; className?: string; tone?: number }) {
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
    <div role="img" aria-label={alt} className={`bg-gradient-to-br ${gradients[tone % gradients.length]} ${className ?? ""}`} />
  );
}
