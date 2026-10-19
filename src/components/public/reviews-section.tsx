import Link from "next/link";
import { ShieldCheck } from "@/components/ui/icons";
import { buttonClassName } from "@/components/ui/button";
import type { PublicRating } from "@/lib/public-demo";
import { formatRating, ratingHeadline, REVIEW_CATEGORIES } from "@/lib/reviews";
import type { PublicReview } from "@/server/reviews/service";
import { Stars } from "./stars";

/** Rating summary for a hero or card: stars and count, or "New". */
export function RatingBadge({
  rating,
  className = "",
}: {
  rating: PublicRating;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm ${className}`}>
      {rating.displayRating !== null ? (
        <>
          <Stars value={rating.displayRating} className="h-3.5 w-3.5" />
          <span className="sr-only">
            Rated {formatRating(rating.displayRating)} out of 5.{" "}
          </span>
        </>
      ) : null}
      <span>{ratingHeadline(rating)}</span>
    </span>
  );
}

/** Reviews for a unit or a host: summary, category scores, and the reviews. */
export function ReviewsSection({
  id,
  rating,
  reviews,
  writeHref,
  showUnitName,
}: {
  id: string;
  rating: PublicRating;
  reviews: PublicReview[];
  /** The open review link; shown on unit pages only. */
  writeHref?: string;
  showUnitName?: boolean;
}) {
  const categories = REVIEW_CATEGORIES.filter(
    ({ key }) => rating.categories[key] !== undefined,
  );
  return (
    <section aria-labelledby={`${id}-heading`} className="py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id={`${id}-heading`} className="font-display text-3xl text-pine">
            Guest reviews
          </h2>
          <RatingBadge rating={rating} className="mt-1 text-ink/70" />
        </div>
        {writeHref ? (
          <Link href={writeHref} className={buttonClassName("outline", "md")}>
            Write a review
          </Link>
        ) : null}
      </div>

      {categories.length > 0 && rating.displayRating !== null ? (
        <dl className="mt-6 grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3 lg:grid-cols-5">
          {categories.map(({ key, label }) => (
            <div key={key}>
              <dt className="text-sm text-ink/60">{label}</dt>
              <dd className="text-lg font-semibold text-pine">
                {formatRating(rating.categories[key]!)}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      {reviews.length === 0 ? (
        <p className="mt-6 text-sm text-ink/60">
          No reviews yet. Be the first to share how your stay went.
        </p>
      ) : (
        <ul className="mt-8 grid gap-8 md:grid-cols-2">
          {reviews.map((review) => (
            <li key={review.id} className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-pine">
                  {review.guestName}
                </span>
                <Stars value={review.rating} className="h-3.5 w-3.5" />
              </div>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-ink/55">
                <span>{review.when}</span>
                {showUnitName && review.unitName ? (
                  <span>· {review.unitName}</span>
                ) : null}
                {review.kind === "verified" ? (
                  <span className="inline-flex items-center gap-1 text-pine">
                    · <ShieldCheck weight="fill" className="h-3.5 w-3.5" aria-hidden />
                    Verified stay
                  </span>
                ) : (
                  <span>· Guest review</span>
                )}
              </p>
              {review.body ? (
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink/80">
                  {review.body}
                </p>
              ) : null}
              {review.hostReply ? (
                <div className="mt-3 rounded-lg bg-sage/40 p-3 text-sm">
                  <p className="font-medium text-pine">Reply from the host</p>
                  <p className="mt-1 whitespace-pre-line text-ink/75">
                    {review.hostReply}
                  </p>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
