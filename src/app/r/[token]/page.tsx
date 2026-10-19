import type { Metadata } from "next";
import { Logo } from "@/components/logo";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyArt } from "@/components/ui/empty-art";
import { CalendarBlank, MapPin } from "@/components/ui/icons";
import { ReviewForm } from "@/components/public/review-form";
import { getReviewLinkContext } from "@/server/reviews/service";
import { submitVerifiedReviewAction } from "./actions";

export const metadata: Metadata = {
  title: "Review your stay",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export const dynamic = "force-dynamic";

/** "Oct 3 – 5, 2026", "Oct 30 – Nov 2, 2026", or with two years across New Year. */
function stayRange(checkIn: string, checkOut: string): string {
  const start = new Date(`${checkIn}T00:00:00Z`);
  const end = new Date(`${checkOut}T00:00:00Z`);
  const fmt = (date: Date, options: Intl.DateTimeFormatOptions) =>
    date.toLocaleDateString("en-PH", { ...options, timeZone: "UTC" });
  if (start.getUTCFullYear() !== end.getUTCFullYear()) {
    const full: Intl.DateTimeFormatOptions = {
      month: "short",
      day: "numeric",
      year: "numeric",
    };
    return `${fmt(start, full)} – ${fmt(end, full)}`;
  }
  const sameMonth = start.getUTCMonth() === end.getUTCMonth();
  return `${fmt(start, { month: "short", day: "numeric" })} – ${
    sameMonth
      ? fmt(end, { day: "numeric" })
      : fmt(end, { month: "short", day: "numeric" })
  }, ${start.getUTCFullYear()}`;
}

export default async function ReviewStayPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  // The opaque review token is the only authorization; no app session.
  const context = await getReviewLinkContext(token);

  return (
    <div className="min-h-dvh bg-paper">
      <header className="border-b border-pine/10 bg-surface">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3 px-4 py-4">
          <Logo />
          <span className="text-xs text-ink/50">Review link</span>
        </div>
      </header>
      <main className="mx-auto max-w-xl px-4 pb-16 pt-8 sm:pt-12">
        {!context ? (
          <Card>
            <CardBody className="py-10 text-center">
              <h1 className="font-display text-2xl text-pine">
                This link is not valid
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-ink/60">
                The link may have expired or been replaced by a newer one.
                Please ask your host for a new review link.
              </p>
            </CardBody>
          </Card>
        ) : context.alreadyReviewed ? (
          <Card>
            <CardBody className="py-10 text-center">
              <EmptyArt name="reviews" className="mb-4" />
              <h1 className="font-display text-2xl text-pine">
                Thanks, {context.guestFirstName}!
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-ink/60">
                Your review of {context.unitName} has been received.
              </p>
            </CardBody>
          </Card>
        ) : (
          <>
            <p className="text-sm font-medium uppercase tracking-wide text-clay-deep">
              Your stay with {context.hostName}
            </p>
            <h1 className="mt-2 font-display text-4xl leading-tight text-pine sm:text-5xl">
              How was your stay, {context.guestFirstName}?
            </h1>
            <p className="mt-3 max-w-md text-ink/65">
              A few honest words help future guests choose, and help your host
              keep improving.
            </p>

            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 rounded-xl border border-pine/10 bg-surface px-4 py-3 text-sm text-ink/75">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-pine/60" aria-hidden />
                {context.unitName} · {context.propertyName}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CalendarBlank className="h-4 w-4 text-pine/60" aria-hidden />
                {stayRange(context.checkInDate, context.checkOutDate)}
              </span>
            </div>

            <Card className="mt-6 shadow-[0_1px_2px_rgba(32,58,53,0.06)]">
              <CardBody className="px-5 py-6 sm:px-7 sm:py-8">
                <ReviewForm
                  mode="verified"
                  action={submitVerifiedReviewAction.bind(null, token)}
                  thanks={`Your review helps ${context.hostName} and future guests. Hope to host you again.`}
                />
              </CardBody>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
