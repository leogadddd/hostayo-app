import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CaretLeft, MapPin } from "@/components/ui/icons";
import { Card, CardBody } from "@/components/ui/card";
import {
  PhotoPlaceholder,
  PublicShell,
} from "@/components/public/public-shell";
import { RatingBadge } from "@/components/public/reviews-section";
import { ReviewForm } from "@/components/public/review-form";
import { getPublicUnit } from "@/lib/public-demo";
import { submitCommunityReviewAction } from "./actions";

type Params = { host: string; unit: string };

export const metadata: Metadata = {
  title: "Write a review",
  robots: { index: false, follow: true },
};

export default async function CommunityReviewPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { host: hostSlug, unit: unitSlug } = await params;
  const found = await getPublicUnit(hostSlug, unitSlug);
  if (!found) notFound();
  const { host, unit } = found;
  const hostHref = `/h/${encodeURIComponent(host.slug)}`;
  const unitHref = `${hostHref}/${encodeURIComponent(unit.slug)}`;

  return (
    <PublicShell label={host.displayName} labelHref={hostHref}>
      <div className="mx-auto max-w-xl px-4 pb-16 pt-6 sm:pt-8">
        <Link
          href={unitHref}
          className="inline-flex items-center gap-1 text-sm text-pine hover:underline"
        >
          <CaretLeft className="h-4 w-4" aria-hidden />
          Back to {unit.name}
        </Link>

        <p className="mt-6 text-sm font-medium uppercase tracking-wide text-clay-deep">
          Review {host.displayName}
        </p>
        <h1 className="mt-2 font-display text-4xl leading-tight text-pine sm:text-5xl">
          How was your stay at {unit.name}?
        </h1>
        <p className="mt-3 max-w-md text-ink/65">
          Your words help other guests choose, and help the host keep improving.
        </p>

        <Link
          href={unitHref}
          className="mt-5 flex items-center gap-3 rounded-xl border border-pine/10 bg-surface p-3 hover:border-pine/25"
        >
          <PhotoPlaceholder
            src={unit.imageUrl}
            alt=""
            className="h-16 w-16 shrink-0 rounded-lg object-cover"
          />
          <span className="min-w-0">
            <span className="block truncate font-medium text-pine">
              {unit.name}
            </span>
            <span className="mt-0.5 flex items-center gap-1 truncate text-sm text-ink/60">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {unit.propertyName} · {unit.location}
            </span>
            <RatingBadge
              rating={unit.rating}
              className="mt-0.5 text-xs text-ink/65"
            />
          </span>
        </Link>

        <Card className="mt-6 shadow-[0_1px_2px_rgba(32,58,53,0.06)]">
          <CardBody className="px-5 py-6 sm:px-7 sm:py-8">
            <ReviewForm
              mode="community"
              action={submitCommunityReviewAction.bind(
                null,
                hostSlug,
                unitSlug,
              )}
              thanks={`Your review of ${unit.name} has been received. We appreciate you taking the time.`}
            />
          </CardBody>
        </Card>
      </div>
    </PublicShell>
  );
}
