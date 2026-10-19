import { describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { reviews } from "@/lib/db/schema";
import { checkIn, checkOut } from "@/server/operations/service";
import { confirmHold, createHold } from "@/server/reservations/service";
import {
  createReviewLink,
  getReservationReview,
  getReviewSummaries,
  listMatchableStays,
  listPublicReviews,
  matchCommunityReview,
  replyToReview,
  ReviewError,
  setReviewStatus,
  submitCommunityReview,
  submitVerifiedReview,
} from "@/server/reviews/service";
import {
  createActiveUnit,
  createTestOrg,
  createTestProperty,
  stayDates,
} from "./helpers";

async function checkedOutStay(
  org: { id: string },
  ownerId: string,
  unitId: string,
  startOffset: number,
  guestName = "Maria Santos",
) {
  const { checkIn: inDate, checkOut: outDate } = stayDates(startOffset);
  const hold = await createHold({
    organizationId: org.id,
    actorUserId: ownerId,
    guest: { newGuest: { name: guestName, email: `${startOffset}@example.com`, phone: "0917 000 0000" } },
    idempotencyKey: `review-hold-${startOffset}`,
    data: {
      unitId,
      checkIn: inDate,
      checkOut: outDate,
      guestCount: 2,
      holdMinutes: 30,
      charges: [
        { type: "accommodation", description: "Nightly rate", quantity: 2, unitAmountCents: 250_000 },
      ],
    },
  });
  await confirmHold({
    organizationId: org.id,
    actorUserId: ownerId,
    reservationId: hold.id,
    reason: "Test",
  });
  return hold;
}

async function finishStay(orgId: string, ownerId: string, reservationId: string) {
  await checkIn({ organizationId: orgId, actorUserId: ownerId, reservationId, data: {} });
  await checkOut({ organizationId: orgId, actorUserId: ownerId, reservationId, data: {} });
}

describe("guest reviews", () => {
  it("verifies a stay, publishes the review, and keeps private feedback private", async () => {
    const { org, owner } = await createTestOrg("reviews");
    const property = await createTestProperty(org.id, owner.id);
    const unit = await createActiveUnit(org.id, owner.id, property.id);
    const stay = await checkedOutStay(org, owner.id, unit.id, 100);

    // No link before the guest has checked out.
    await expect(
      createReviewLink({ organizationId: org.id, actorUserId: owner.id, reservationId: stay.id }),
    ).rejects.toThrow(/checked out/);

    await finishStay(org.id, owner.id, stay.id);
    const first = await createReviewLink({ organizationId: org.id, actorUserId: owner.id, reservationId: stay.id });
    // A newer link replaces the old one.
    const second = await createReviewLink({ organizationId: org.id, actorUserId: owner.id, reservationId: stay.id });
    await expect(
      submitVerifiedReview({ token: first.token, data: { rating: 5 } }),
    ).rejects.toThrow(/no longer valid/);

    await expect(
      submitVerifiedReview({ token: second.token, data: { rating: 0 } }),
    ).rejects.toBeInstanceOf(ReviewError);
    await expect(
      submitVerifiedReview({ token: second.token, data: { rating: 5, body: "see http://spam.example" } }),
    ).rejects.toThrow(/links/);

    await submitVerifiedReview({
      token: second.token,
      data: {
        rating: 5,
        categoryScores: { cleanliness: 5, value: 4, bogus: 1 },
        body: "Lovely place.",
        privateFeedback: "The aircon remote was missing.",
      },
    });
    await expect(
      submitVerifiedReview({ token: second.token, data: { rating: 4 } }),
    ).rejects.toThrow(/already reviewed/);
    await expect(
      createReviewLink({ organizationId: org.id, actorUserId: owner.id, reservationId: stay.id }),
    ).rejects.toThrow(/already has a review/);

    const [stored] = await db.select().from(reviews).where(eq(reviews.reservationId, stay.id));
    expect(stored).toMatchObject({
      kind: "verified",
      status: "published",
      guestName: "Maria",
      source: "direct",
      paymentVerified: false,
      stayNights: 2,
    });
    expect(stored!.categoryScores).toEqual({ cleanliness: 5, value: 4 });

    const publicReviews = await listPublicReviews({ unitId: unit.id });
    expect(publicReviews).toHaveLength(1);
    expect(JSON.stringify(publicReviews)).not.toContain("aircon");
    expect(await getReservationReview(org.id, stay.id)).toMatchObject({ rating: 5 });
  });

  it("holds open-link reviews for approval, limits repeats, and lets a host verify them", async () => {
    const { org, owner } = await createTestOrg("community");
    const property = await createTestProperty(org.id, owner.id);
    const unit = await createActiveUnit(org.id, owner.id, property.id);
    const stay = await checkedOutStay(org, owner.id, unit.id, 120, "Ben Reyes");
    await finishStay(org.id, owner.id, stay.id);

    const input = {
      hostSlug: org.slug,
      unitSlug: unit.publicSlug,
      fingerprint: "fp-one",
      data: { rating: 4, body: "Great stay overall.", guestName: "Ben" },
    };
    await submitCommunityReview(input);
    await expect(submitCommunityReview(input)).rejects.toThrow(/already sent/);
    await expect(
      submitCommunityReview({ ...input, fingerprint: "fp-two", data: { rating: 4, body: "short", guestName: "Ben" } }),
    ).rejects.toThrow(/little about/);

    // Pending reviews are invisible to the public and count for nothing.
    expect(await listPublicReviews({ unitId: unit.id })).toHaveLength(0);
    const [pending] = await db.select().from(reviews).where(eq(reviews.unitId, unit.id));
    expect(pending).toMatchObject({ kind: "community", status: "pending", reservationId: null });

    const stays = await listMatchableStays(org.id, unit.id);
    expect(stays.map((s) => s.reservationId)).toEqual([stay.id]);

    await matchCommunityReview({
      organizationId: org.id,
      actorUserId: owner.id,
      reviewId: pending!.id,
      reservationId: stay.id,
    });
    const [matched] = await db.select().from(reviews).where(eq(reviews.id, pending!.id));
    expect(matched).toMatchObject({ kind: "verified", status: "published", reservationId: stay.id });
    expect(await listMatchableStays(org.id, unit.id)).toHaveLength(0);
    expect(await listPublicReviews({ unitId: unit.id })).toHaveLength(1);
  });

  it("lets hosts reply and hide, only within their own workspace", async () => {
    const { org, owner } = await createTestOrg("moderation");
    const other = await createTestOrg("moderation-other");
    const property = await createTestProperty(org.id, owner.id);
    const unit = await createActiveUnit(org.id, owner.id, property.id);

    await submitCommunityReview({
      hostSlug: org.slug,
      unitSlug: unit.publicSlug,
      fingerprint: "fp-mod",
      data: { rating: 2, body: "Not what I expected.", guestName: "Jo" },
    });
    const [review] = await db.select().from(reviews).where(eq(reviews.unitId, unit.id));

    await expect(
      replyToReview({ organizationId: org.id, actorUserId: owner.id, reviewId: review!.id, reply: "Sorry!" }),
    ).rejects.toThrow(/Approve this review/);
    await expect(
      setReviewStatus({ organizationId: other.org.id, actorUserId: other.owner.id, reviewId: review!.id, status: "published" }),
    ).rejects.toThrow(/not found/);

    await setReviewStatus({ organizationId: org.id, actorUserId: owner.id, reviewId: review!.id, status: "published" });
    await replyToReview({ organizationId: org.id, actorUserId: owner.id, reviewId: review!.id, reply: "Sorry to hear that." });
    expect((await listPublicReviews({ unitId: unit.id }))[0]?.hostReply).toBe("Sorry to hear that.");

    await setReviewStatus({ organizationId: org.id, actorUserId: owner.id, reviewId: review!.id, status: "hidden" });
    expect(await listPublicReviews({ unitId: unit.id })).toHaveLength(0);
    const [stored] = await db
      .select()
      .from(reviews)
      .where(and(eq(reviews.id, review!.id), eq(reviews.organizationId, org.id)));
    expect(stored?.status).toBe("hidden");
  });

  it("shows New until three verified reviews, then the average", async () => {
    const { org, owner } = await createTestOrg("scores");
    const property = await createTestProperty(org.id, owner.id);
    const unit = await createActiveUnit(org.id, owner.id, property.id);

    for (const [index, rating] of [5, 4, 5].entries()) {
      const stay = await checkedOutStay(org, owner.id, unit.id, 140 + index * 5, `Guest ${index}`);
      await finishStay(org.id, owner.id, stay.id);
      const link = await createReviewLink({ organizationId: org.id, actorUserId: owner.id, reservationId: stay.id });
      await submitVerifiedReview({ token: link.token, data: { rating } });
      const { overall } = await getReviewSummaries(org.id, [unit.id]);
      if (index < 2) expect(overall.score.displayRating).toBeNull();
    }
    const { byUnit, overall } = await getReviewSummaries(org.id, [unit.id]);
    expect(byUnit.get(unit.id)?.score.verifiedCount).toBe(3);
    // Unpaid direct bookings are discounted equally here, so the mean is unchanged.
    expect(overall.score.displayRating).toBeCloseTo(14 / 3, 5);
  });
});
