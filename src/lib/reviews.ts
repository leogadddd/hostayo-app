/**
 * Review scoring. Pure functions, no database access.
 *
 * Three layers, kept apart on purpose:
 *  1. Trust: every review gets a weight from the signals stored with it
 *     (`reviewWeight`). Signals are snapshotted on the row, so changing the
 *     rules and recomputing never needs the original reservation.
 *  2. Quality: `scoreReviews` turns weighted reviews into a display rating
 *     (what guests see) and a ranking score (Bayesian average with time
 *     decay; what a marketplace sorts by). The two are different on purpose:
 *     a unit with one 5-star review displays "New", not 5.0, and ranks near
 *     the marketplace average, not at the top.
 *  3. Ranking: the marketplace combines `rankingScore` with relevance, price,
 *     availability and host trust. That lives with the marketplace, not here.
 *
 * Bump `REVIEW_ALGO_VERSION` whenever a constant or formula here changes.
 */

export const REVIEW_ALGO_VERSION = 1;

export const REVIEW_KINDS = ["verified", "community"] as const;
export type ReviewKind = (typeof REVIEW_KINDS)[number];

export const REVIEW_STATUSES = ["pending", "published", "hidden"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const REVIEW_CATEGORIES = [
  { key: "cleanliness", label: "Cleanliness" },
  { key: "accuracy", label: "Accuracy" },
  { key: "checkin", label: "Check-in" },
  { key: "value", label: "Value" },
  { key: "location", label: "Location" },
] as const;
export type ReviewCategoryKey = (typeof REVIEW_CATEGORIES)[number]["key"];
export type CategoryScores = Partial<Record<ReviewCategoryKey, number>>;

export const REVIEW_BODY_MAX = 2000;
export const REVIEW_PRIVATE_MAX = 2000;
export const REVIEW_REPLY_MAX = 1000;
export const REVIEW_NAME_MAX = 60;

/** How long a review link works after the owner creates it. */
export const REVIEW_LINK_TTL_DAYS = 30;

// Tuning. Starting values; revisit against real data and bump the version.
/** Marketplace-wide prior mean rating (m). */
export const PRIOR_MEAN = 4.3;
/** Prior strength (C), in review-weight units. */
export const PRIOR_WEIGHT = 5;
/** A review's influence halves every this many days. */
export const HALF_LIFE_DAYS = 365;
/** Weight of an unverified, host-approved review at full strength. */
export const COMMUNITY_WEIGHT = 0.25;
/** Community weight may add at most this share of the verified weight. */
export const COMMUNITY_CAP_SHARE = 0.25; // = 20% of the combined total
/** Direct booking with no verified payment is the easiest to fake. */
export const UNPAID_DIRECT_FACTOR = 0.6;
/** Reviews left long after the stay count a little less. */
export const LATE_REVIEW_DAYS = 14;
export const LATE_REVIEW_FACTOR = 0.85;
/** Fewer verified reviews than this shows "New" instead of a score. */
export const MIN_VERIFIED_FOR_SCORE = 3;

const DAY_MS = 86_400_000;

export interface ScorableReview {
  kind: ReviewKind;
  status: ReviewStatus;
  rating: number;
  submittedAt: Date;
  /** Snapshots taken when the review was written (verified reviews). */
  stayCheckOutAt?: Date | null;
  source?: string | null;
  paymentVerified?: boolean | null;
  /** Set by moderators to zero a review out (reports, abuse). */
  flagged?: boolean;
}

/** Trust weight of one review, 0 to 1, before time decay. */
export function reviewWeight(review: ScorableReview): number {
  if (review.status !== "published" || review.flagged) return 0;
  if (review.kind === "community") return COMMUNITY_WEIGHT;
  let weight = 1;
  if (review.source === "direct" && review.paymentVerified !== true) {
    weight *= UNPAID_DIRECT_FACTOR;
  }
  if (review.stayCheckOutAt) {
    const lateDays =
      (review.submittedAt.getTime() - review.stayCheckOutAt.getTime()) /
      DAY_MS;
    if (lateDays > LATE_REVIEW_DAYS) weight *= LATE_REVIEW_FACTOR;
  }
  return weight;
}

/** Exponential decay: 1 now, 0.5 after one half-life. Never negative age. */
export function decay(submittedAt: Date, now: Date): number {
  const ageDays = Math.max(0, (now.getTime() - submittedAt.getTime()) / DAY_MS);
  return Math.pow(0.5, ageDays / HALF_LIFE_DAYS);
}

export interface ReviewScore {
  /** Published reviews of any kind. */
  count: number;
  verifiedCount: number;
  /** Weighted mean shown to guests; null while the listing is still "New". */
  displayRating: number | null;
  /** Bayesian, time-decayed score for sorting; always defined. */
  rankingScore: number;
  algoVersion: number;
}

/**
 * Score a set of reviews (one unit, or a whole workspace).
 *
 * Community weight is scaled down when it would exceed
 * `COMMUNITY_CAP_SHARE` of the verified weight, so a flood of unverified
 * reviews can't move a score. With no verified reviews they carry nothing.
 */
export function scoreReviews(
  reviews: readonly ScorableReview[],
  now: Date = new Date(),
): ReviewScore {
  let verifiedWeight = 0;
  let verifiedSum = 0;
  let verifiedDecayedWeight = 0;
  let verifiedDecayedSum = 0;
  let communityWeight = 0;
  let communitySum = 0;
  let communityDecayedWeight = 0;
  let communityDecayedSum = 0;
  let count = 0;
  let verifiedCount = 0;

  for (const review of reviews) {
    const weight = reviewWeight(review);
    if (weight <= 0) continue;
    count += 1;
    const decayed = weight * decay(review.submittedAt, now);
    if (review.kind === "verified") {
      verifiedCount += 1;
      verifiedWeight += weight;
      verifiedSum += weight * review.rating;
      verifiedDecayedWeight += decayed;
      verifiedDecayedSum += decayed * review.rating;
    } else {
      communityWeight += weight;
      communitySum += weight * review.rating;
      communityDecayedWeight += decayed;
      communityDecayedSum += decayed * review.rating;
    }
  }

  const allowed = verifiedWeight * COMMUNITY_CAP_SHARE;
  const scale = communityWeight > allowed ? allowed / communityWeight : 1;

  const rankWeight = verifiedDecayedWeight + communityDecayedWeight * scale;
  const rankSum = verifiedDecayedSum + communityDecayedSum * scale;
  const rankingScore =
    (PRIOR_WEIGHT * PRIOR_MEAN + rankSum) / (PRIOR_WEIGHT + rankWeight);

  const shownWeight = verifiedWeight + communityWeight * scale;
  const shownSum = verifiedSum + communitySum * scale;
  const displayRating =
    verifiedCount >= MIN_VERIFIED_FOR_SCORE && shownWeight > 0
      ? shownSum / shownWeight
      : null;

  return {
    count,
    verifiedCount,
    displayRating,
    rankingScore,
    algoVersion: REVIEW_ALGO_VERSION,
  };
}

/** Mean of each category across reviews that rated it (unweighted). */
export function categoryAverages(
  reviews: readonly { categoryScores: CategoryScores }[],
): CategoryScores {
  const result: CategoryScores = {};
  for (const { key } of REVIEW_CATEGORIES) {
    const values = reviews
      .map((review) => review.categoryScores[key])
      .filter((value): value is number => typeof value === "number");
    if (values.length > 0) {
      result[key] = values.reduce((a, b) => a + b, 0) / values.length;
    }
  }
  return result;
}

export function formatRating(value: number): string {
  return value.toFixed(1);
}

/** A public-page headline for a score: stars and count, or "New". */
export function ratingHeadline(score: {
  count: number;
  displayRating: number | null;
}): string {
  if (score.displayRating === null) {
    return score.count === 0
      ? "New"
      : `New · ${score.count} ${score.count === 1 ? "review" : "reviews"}`;
  }
  return `${formatRating(score.displayRating)} · ${score.count} ${
    score.count === 1 ? "review" : "reviews"
  }`;
}

export function isRatingValue(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 5
  );
}

/** Keep only known categories with 1–5 integer values. */
export function cleanCategoryScores(input: unknown): CategoryScores {
  const result: CategoryScores = {};
  if (typeof input !== "object" || input === null) return result;
  for (const { key } of REVIEW_CATEGORIES) {
    const value = (input as Record<string, unknown>)[key];
    if (isRatingValue(value)) result[key] = value;
  }
  return result;
}
