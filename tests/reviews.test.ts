import { describe, expect, it } from "vitest";
import {
  categoryAverages,
  cleanCategoryScores,
  decay,
  PRIOR_MEAN,
  ratingHeadline,
  reviewWeight,
  scoreReviews,
  type ScorableReview,
} from "@/lib/reviews";

const now = new Date("2026-10-19T00:00:00Z");
const daysAgo = (days: number) => new Date(now.getTime() - days * 86_400_000);

const verified = (
  rating: number,
  overrides: Partial<ScorableReview> = {},
): ScorableReview => ({
  kind: "verified",
  status: "published",
  rating,
  submittedAt: daysAgo(1),
  stayCheckOutAt: daysAgo(2),
  source: "airbnb",
  paymentVerified: true,
  ...overrides,
});

const community = (
  rating: number,
  overrides: Partial<ScorableReview> = {},
): ScorableReview => ({
  kind: "community",
  status: "published",
  rating,
  submittedAt: daysAgo(1),
  ...overrides,
});

describe("reviewWeight", () => {
  it("gives a normal verified review full weight", () => {
    expect(reviewWeight(verified(5))).toBe(1);
  });

  it("gives unpublished, hidden and flagged reviews no weight", () => {
    expect(reviewWeight(verified(5, { status: "pending" }))).toBe(0);
    expect(reviewWeight(verified(5, { status: "hidden" }))).toBe(0);
    expect(reviewWeight(verified(5, { flagged: true }))).toBe(0);
  });

  it("discounts direct bookings without a verified payment", () => {
    const unpaid = reviewWeight(
      verified(5, { source: "direct", paymentVerified: false }),
    );
    const paid = reviewWeight(
      verified(5, { source: "direct", paymentVerified: true }),
    );
    expect(unpaid).toBeLessThan(paid);
    expect(paid).toBe(1);
  });

  it("discounts reviews left long after checkout", () => {
    expect(
      reviewWeight(verified(5, { submittedAt: daysAgo(1), stayCheckOutAt: daysAgo(40) })),
    ).toBeLessThan(1);
  });

  it("gives community reviews a low fixed weight", () => {
    expect(reviewWeight(community(5))).toBe(0.25);
  });
});

describe("decay", () => {
  it("is 1 now, 0.5 after a year, and never above 1", () => {
    expect(decay(now, now)).toBe(1);
    expect(decay(daysAgo(365), now)).toBeCloseTo(0.5);
    expect(decay(new Date(now.getTime() + 86_400_000), now)).toBe(1);
  });
});

describe("scoreReviews", () => {
  it("ranks a unit with no reviews at the prior and shows New", () => {
    const score = scoreReviews([], now);
    expect(score.rankingScore).toBeCloseTo(PRIOR_MEAN);
    expect(score.displayRating).toBeNull();
    expect(ratingHeadline(score)).toBe("New");
  });

  it("does not let one 5-star review look perfect", () => {
    const score = scoreReviews([verified(5)], now);
    expect(score.rankingScore).toBeGreaterThan(PRIOR_MEAN);
    expect(score.rankingScore).toBeLessThan(4.6);
    expect(score.displayRating).toBeNull();
    expect(ratingHeadline(score)).toBe("New · 1 review");
  });

  it("shows the weighted mean once there are enough verified reviews", () => {
    const score = scoreReviews([verified(5), verified(4), verified(5)], now);
    expect(score.displayRating).toBeCloseTo(14 / 3);
    expect(ratingHeadline(score)).toBe("4.7 · 3 reviews");
  });

  it("ranks a long 4.7 record above a thin 5.0", () => {
    const many = scoreReviews(
      Array.from({ length: 60 }, (_, i) => verified(i % 3 === 0 ? 4 : 5)),
      now,
    );
    const few = scoreReviews([verified(5), verified(5), verified(5)], now);
    expect(many.rankingScore).toBeGreaterThan(few.rankingScore);
  });

  it("lets recent reviews outweigh old ones", () => {
    const improving = scoreReviews(
      [
        ...Array.from({ length: 5 }, () =>
          verified(2, { submittedAt: daysAgo(900), stayCheckOutAt: daysAgo(901) }),
        ),
        ...Array.from({ length: 5 }, () => verified(5)),
      ],
      now,
    );
    const declining = scoreReviews(
      [
        ...Array.from({ length: 5 }, () =>
          verified(5, { submittedAt: daysAgo(900), stayCheckOutAt: daysAgo(901) }),
        ),
        ...Array.from({ length: 5 }, () => verified(2)),
      ],
      now,
    );
    expect(improving.rankingScore).toBeGreaterThan(declining.rankingScore);
  });

  it("caps how much unverified reviews can move the score", () => {
    const base = [verified(4), verified(4), verified(4), verified(4)];
    const flooded = scoreReviews(
      [...base, ...Array.from({ length: 200 }, () => community(5))],
      now,
    );
    const plain = scoreReviews(base, now);
    // 200 community 5-stars may add at most 20% of the combined weight.
    expect(flooded.displayRating).toBeLessThanOrEqual(4.2 + 1e-9);
    expect(flooded.displayRating).toBeGreaterThan(plain.displayRating!);
    expect(flooded.count).toBe(204);
    expect(flooded.verifiedCount).toBe(4);
  });

  it("gives community reviews no weight when nothing is verified", () => {
    const score = scoreReviews(
      Array.from({ length: 50 }, () => community(5)),
      now,
    );
    expect(score.rankingScore).toBeCloseTo(PRIOR_MEAN);
    expect(score.displayRating).toBeNull();
  });

  it("ignores pending and hidden reviews", () => {
    const score = scoreReviews(
      [
        verified(5),
        verified(5),
        verified(5),
        verified(1, { status: "hidden" }),
        community(1, { status: "pending" }),
      ],
      now,
    );
    expect(score.count).toBe(3);
    expect(score.displayRating).toBe(5);
  });
});

describe("categories", () => {
  it("keeps only known categories with 1-5 integers", () => {
    expect(
      cleanCategoryScores({
        cleanliness: 5,
        value: 6,
        location: 3.5,
        accuracy: "4",
        bogus: 5,
      }),
    ).toEqual({ cleanliness: 5 });
    expect(cleanCategoryScores(null)).toEqual({});
  });

  it("averages each category over the reviews that rated it", () => {
    const averages = categoryAverages([
      { categoryScores: { cleanliness: 5, value: 3 } },
      { categoryScores: { cleanliness: 4 } },
      { categoryScores: {} },
    ]);
    expect(averages.cleanliness).toBeCloseTo(4.5);
    expect(averages.value).toBe(3);
    expect(averages.location).toBeUndefined();
  });
});
