import Link from "next/link";
import { Logo } from "@/components/logo";
import { loginLinksHidden } from "@/lib/flags";
import { PUBLIC_PAGES, SITE_URL } from "@/lib/site";

export interface LegalSection {
  title: string;
  content: string;
}

/** Shared shell for the public legal pages (header, intro and numbered sections). */
export function LegalPage({
  title,
  intro,
  effectiveDate,
  sections,
}: {
  title: string;
  intro: string;
  effectiveDate: string;
  sections: LegalSection[];
}) {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="border-b border-pine/10">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5 sm:px-8">
          <a href={SITE_URL} aria-label="Hostayo home">
            <Logo />
          </a>
          {loginLinksHidden() ? null : (
            <Link
              href="/login"
              className="text-sm font-medium text-pine underline underline-offset-4 hover:text-pine-soft"
            >
              Sign in
            </Link>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-14 sm:px-8 sm:py-20">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine/75">
            Legal
          </p>
          <h1 className="mt-3 font-display text-4xl leading-tight text-pine sm:text-5xl">
            {title}
          </h1>
          <p className="mt-5 text-sm leading-relaxed text-ink/75 sm:text-base">
            {intro}
          </p>
          <p className="mt-5 text-sm text-ink/75">
            Effective date: {effectiveDate}
          </p>
        </div>

        <div className="mt-14 max-w-3xl space-y-10 sm:mt-16">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="font-display text-2xl text-pine">
                {section.title}
              </h2>
              <p className="mt-3 text-sm leading-7 text-ink/70 sm:text-base">
                {section.content}
              </p>
            </section>
          ))}
        </div>

        <nav
          aria-label="Related policies"
          className="mt-16 max-w-3xl border-t border-pine/10 pt-8 text-sm"
        >
          <h2 className="font-display text-xl text-pine">Related policies</h2>
          <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
            {PUBLIC_PAGES.filter((p) => !["/login", "/register"].includes(p.path)).map((p) => (
              <li key={p.path}>
                <Link href={p.path} className="text-pine underline underline-offset-4 hover:text-pine-soft">
                  {p.title}
                </Link>
              </li>
            ))}
            <li>
              <a href={SITE_URL} className="text-pine underline underline-offset-4 hover:text-pine-soft">
                About Hostayo
              </a>
            </li>
          </ul>
        </nav>
      </main>
    </div>
  );
}
