import "server-only";

import { createHash, randomBytes } from "crypto";
import { and, desc, eq, gte, inArray, isNull, notExists, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  auditEvents,
  guests,
  organizations,
  paymentEntries,
  properties,
  reservations,
  reviewLinks,
  reviews,
  units,
  type Review,
} from "@/lib/db/schema";
import {
  categoryAverages,
  cleanCategoryScores,
  isRatingValue,
  REVIEW_BODY_MAX,
  REVIEW_LINK_TTL_DAYS,
  REVIEW_NAME_MAX,
  REVIEW_PRIVATE_MAX,
  REVIEW_REPLY_MAX,
  scoreReviews,
  type CategoryScores,
  type ReviewScore,
  type ScorableReview,
} from "@/lib/reviews";

export class ReviewError extends Error {
  constructor(
    message: string,
    public readonly field?: string,
  ) {
    super(message);
    this.name = "ReviewError";
  }
}

const RAW_TOKEN_BYTES = 24;
/** Community reviews from one reviewer for one unit are spaced at least this far apart. */
const COMMUNITY_REPEAT_DAYS = 90;

export function hashReviewToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// In-memory sliding-window limit, like the guest link's. Fine for a single
// deployable; a restart resets it.
const RATE_WINDOW_MS = 60_000;
const rateBuckets = new Map<string, number[]>();
function allow(key: string, max: number): boolean {
  const now = Date.now();
  const bucket = (rateBuckets.get(key) ?? []).filter(
    (at) => now - at < RATE_WINDOW_MS,
  );
  if (bucket.length >= max) {
    rateBuckets.set(key, bucket);
    return false;
  }
  bucket.push(now);
  rateBuckets.set(key, bucket);
  if (rateBuckets.size > 5_000) {
    for (const [k, v] of rateBuckets) {
      if (v.every((at) => now - at >= RATE_WINDOW_MS)) rateBuckets.delete(k);
    }
  }
  return true;
}

/** Hash of the reviewer's network and browser; stored to limit repeat reviews. */
export function reviewerFingerprint(ip: string, userAgent: string): string {
  const salt = process.env.BETTER_AUTH_SECRET ?? "";
  return createHash("sha256")
    .update(`${salt}|${ip}|${userAgent}`)
    .digest("hex");
}

export interface ReviewInput {
  rating: number;
  categoryScores?: unknown;
  body?: string;
  privateFeedback?: string;
  /** Community reviews supply their own name; verified ones use the guest's. */
  guestName?: string;
  /** Verified reviews: show "A guest" instead of the first name. */
  anonymous?: boolean;
}

function cleanText(value: string | undefined, max: number, field: string) {
  const text = (value ?? "").trim();
  if (text.length > max) {
    throw new ReviewError(`Keep this under ${max} characters.`, field);
  }
  return text;
}

function validateCommon(input: ReviewInput) {
  if (!isRatingValue(input.rating)) {
    throw new ReviewError("Choose a rating from 1 to 5 stars.", "rating");
  }
  const body = cleanText(input.body, REVIEW_BODY_MAX, "body");
  if (/https?:\/\/|www\./i.test(body)) {
    throw new ReviewError("Reviews can't contain links.", "body");
  }
  const privateFeedback =
    cleanText(input.privateFeedback, REVIEW_PRIVATE_MAX, "privateFeedback") ||
    null;
  return {
    rating: input.rating,
    categoryScores: cleanCategoryScores(input.categoryScores),
    body,
    privateFeedback,
  };
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0]?.slice(0, REVIEW_NAME_MAX) || "Guest";
}

// ---------------------------------------------------------------------------
// Review links (verified reviews)
// ---------------------------------------------------------------------------

/**
 * Create the review link for a checked-out reservation. A new link revokes
 * any active one. Returns the raw token once; only its hash is stored.
 */
export async function createReviewLink(input: {
  organizationId: string;
  actorUserId: string;
  reservationId: string;
}): Promise<{ linkId: string; token: string }> {
  return db.transaction(async (tx) => {
    const [reservation] = await tx
      .select({ id: reservations.id, status: reservations.status })
      .from(reservations)
      .where(
        and(
          eq(reservations.id, input.reservationId),
          eq(reservations.organizationId, input.organizationId),
        ),
      )
      .limit(1);
    if (!reservation) {
      throw new ReviewError("Reservation not found.", "reservationId");
    }
    if (reservation.status !== "checked_out") {
      throw new ReviewError(
        "A review link can be created once the guest has checked out.",
        "reservationId",
      );
    }
    const [existing] = await tx
      .select({ id: reviews.id })
      .from(reviews)
      .where(eq(reviews.reservationId, input.reservationId))
      .limit(1);
    if (existing) {
      throw new ReviewError(
        "This stay already has a review.",
        "reservationId",
      );
    }

    const now = new Date();
    await tx
      .update(reviewLinks)
      .set({ revokedAt: now })
      .where(
        and(
          eq(reviewLinks.reservationId, input.reservationId),
          eq(reviewLinks.organizationId, input.organizationId),
          isNull(reviewLinks.revokedAt),
        ),
      );

    const token = randomBytes(RAW_TOKEN_BYTES).toString("base64url");
    const [created] = await tx
      .insert(reviewLinks)
      .values({
        organizationId: input.organizationId,
        reservationId: input.reservationId,
        tokenHash: hashReviewToken(token),
        createdBy: input.actorUserId,
        expiresAt: new Date(now.getTime() + REVIEW_LINK_TTL_DAYS * 86_400_000),
      })
      .returning({ id: reviewLinks.id });
    if (!created) throw new ReviewError("Failed to create the review link.");
    await tx.insert(auditEvents).values({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      entity: "review_link",
      entityId: created.id,
      action: "review_link.created",
      metadata: { reservationId: input.reservationId },
    });
    return { linkId: created.id, token };
  });
}

export interface ReviewLinkContext {
  linkId: string;
  organizationId: string;
  reservationId: string;
  unitId: string;
  hostName: string;
  unitName: string;
  propertyName: string;
  guestFirstName: string;
  checkInDate: string;
  checkOutDate: string;
  alreadyReviewed: boolean;
}

/** Resolve a raw review token; null for unknown, revoked, expired or rate-limited ones. */
export async function getReviewLinkContext(
  token: string,
): Promise<ReviewLinkContext | null> {
  if (!token || token.length > 200) return null;
  const hash = hashReviewToken(token);
  if (!allow(`link:${hash}`, 30)) return null;

  const [row] = await db
    .select({
      linkId: reviewLinks.id,
      organizationId: reviewLinks.organizationId,
      reservationId: reviewLinks.reservationId,
      expiresAt: reviewLinks.expiresAt,
      revokedAt: reviewLinks.revokedAt,
      unitId: units.id,
      unitName: units.name,
      propertyName: properties.name,
      hostName: organizations.displayName,
      orgName: organizations.name,
      guestName: guests.name,
      checkInDate: reservations.checkInDate,
      checkOutDate: reservations.checkOutDate,
      status: reservations.status,
    })
    .from(reviewLinks)
    .innerJoin(
      reservations,
      and(
        eq(reviewLinks.reservationId, reservations.id),
        eq(reviewLinks.organizationId, reservations.organizationId),
      ),
    )
    .innerJoin(
      units,
      and(
        eq(reservations.unitId, units.id),
        eq(reservations.organizationId, units.organizationId),
      ),
    )
    .innerJoin(
      properties,
      and(
        eq(units.propertyId, properties.id),
        eq(units.organizationId, properties.organizationId),
      ),
    )
    .innerJoin(
      guests,
      and(
        eq(reservations.guestId, guests.id),
        eq(reservations.organizationId, guests.organizationId),
      ),
    )
    .innerJoin(organizations, eq(reservations.organizationId, organizations.id))
    .where(eq(reviewLinks.tokenHash, hash))
    .limit(1);
  if (!row || row.revokedAt !== null || row.expiresAt <= new Date()) {
    return null;
  }
  if (row.status !== "checked_out") return null;

  const [existing] = await db
    .select({ id: reviews.id })
    .from(reviews)
    .where(eq(reviews.reservationId, row.reservationId))
    .limit(1);

  return {
    linkId: row.linkId,
    organizationId: row.organizationId,
    reservationId: row.reservationId,
    unitId: row.unitId,
    hostName: row.hostName ?? row.orgName,
    unitName: row.unitName,
    propertyName: row.propertyName,
    guestFirstName: firstName(row.guestName),
    checkInDate: row.checkInDate,
    checkOutDate: row.checkOutDate,
    alreadyReviewed: Boolean(existing),
  };
}

/** Submit the verified review for the stay a review link belongs to. */
export async function submitVerifiedReview(input: {
  token: string;
  data: ReviewInput;
}): Promise<void> {
  const context = await getReviewLinkContext(input.token);
  if (!context) {
    throw new ReviewError("This review link is no longer valid.");
  }
  if (context.alreadyReviewed) {
    throw new ReviewError("You've already reviewed this stay. Thank you!");
  }
  const common = validateCommon(input.data);

  await db.transaction(async (tx) => {
    const [stay] = await tx
      .select({
        source: reservations.source,
        checkInDate: reservations.checkInDate,
        checkOutDate: reservations.checkOutDate,
        actualCheckoutAt: reservations.actualCheckoutAt,
        guestName: guests.name,
      })
      .from(reservations)
      .innerJoin(
        guests,
        and(
          eq(reservations.guestId, guests.id),
          eq(reservations.organizationId, guests.organizationId),
        ),
      )
      .where(
        and(
          eq(reservations.id, context.reservationId),
          eq(reservations.organizationId, context.organizationId),
        ),
      )
      .limit(1);
    if (!stay) throw new ReviewError("This review link is no longer valid.");

    const [payment] = await tx
      .select({ id: paymentEntries.id })
      .from(paymentEntries)
      .where(
        and(
          eq(paymentEntries.reservationId, context.reservationId),
          eq(paymentEntries.organizationId, context.organizationId),
          isNull(paymentEntries.reversalOfId),
        ),
      )
      .limit(1);

    const nights = Math.max(
      1,
      Math.round(
        (Date.parse(stay.checkOutDate) - Date.parse(stay.checkInDate)) /
          86_400_000,
      ),
    );
    const inserted = await tx
      .insert(reviews)
      .values({
        organizationId: context.organizationId,
        unitId: context.unitId,
        reservationId: context.reservationId,
        kind: "verified",
        status: "published",
        ...common,
        guestName: input.data.anonymous
          ? "A guest"
          : firstName(stay.guestName),
        stayCheckOutAt:
          stay.actualCheckoutAt ?? new Date(`${stay.checkOutDate}T00:00:00Z`),
        stayNights: nights,
        source: stay.source,
        paymentVerified: Boolean(payment),
      })
      .onConflictDoNothing()
      .returning({ id: reviews.id });
    const created = inserted[0];
    if (!created) {
      throw new ReviewError("You've already reviewed this stay. Thank you!");
    }
    await tx.insert(auditEvents).values({
      organizationId: context.organizationId,
      actorUserId: null,
      entity: "review",
      entityId: created.id,
      action: "review.submitted",
      metadata: { kind: "verified", reservationId: context.reservationId },
    });
  });
}

// ---------------------------------------------------------------------------
// Open link (community reviews)
// ---------------------------------------------------------------------------

/**
 * Submit a community review from the open link on a public unit page. It waits
 * as `pending` until a host approves it, and counts for little (see
 * src/lib/reviews.ts).
 */
export async function submitCommunityReview(input: {
  hostSlug: string;
  unitSlug: string;
  data: ReviewInput;
  fingerprint: string;
}): Promise<void> {
  if (!allow(`community:${input.fingerprint}`, 5)) {
    throw new ReviewError("Too many attempts. Try again in a minute.");
  }
  const common = validateCommon(input.data);
  const guestName = cleanText(input.data.guestName, REVIEW_NAME_MAX, "guestName");
  if (!guestName) throw new ReviewError("Enter your name.", "guestName");
  if (common.body.length < 10) {
    throw new ReviewError("Tell others a little about your stay.", "body");
  }

  const [target] = await db
    .select({
      organizationId: units.organizationId,
      unitId: units.id,
      listed: organizations.publicListingEnabled,
      live: organizations.publicPageLive,
    })
    .from(units)
    .innerJoin(organizations, eq(units.organizationId, organizations.id))
    .where(
      and(
        eq(organizations.slug, input.hostSlug),
        eq(units.publicSlug, input.unitSlug),
        eq(units.status, "active"),
        isNull(units.deletedAt),
      ),
    )
    .limit(1);
  if (!target || !target.live) {
    throw new ReviewError("This listing was not found.");
  }

  const since = new Date(Date.now() - COMMUNITY_REPEAT_DAYS * 86_400_000);
  const [recent] = await db
    .select({ id: reviews.id })
    .from(reviews)
    .where(
      and(
        eq(reviews.unitId, target.unitId),
        eq(reviews.fingerprintHash, input.fingerprint),
        gte(reviews.submittedAt, since),
      ),
    )
    .limit(1);
  if (recent) {
    throw new ReviewError(
      "You've already sent a review for this place. Thank you!",
    );
  }

  await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(reviews)
      .values({
        organizationId: target.organizationId,
        unitId: target.unitId,
        kind: "community",
        status: "pending",
        ...common,
        // Private notes are for verified guests; community reviews have none.
        privateFeedback: null,
        guestName,
        fingerprintHash: input.fingerprint,
      })
      .returning({ id: reviews.id });
    if (!created) throw new ReviewError("Failed to save your review.");
    await tx.insert(auditEvents).values({
      organizationId: target.organizationId,
      actorUserId: null,
      entity: "review",
      entityId: created.id,
      action: "review.submitted",
      metadata: { kind: "community" },
    });
  });
}

// ---------------------------------------------------------------------------
// Host side
// ---------------------------------------------------------------------------

export interface ReviewRow extends Review {
  unitName: string;
  propertyName: string;
}

export async function listOrgReviews(
  organizationId: string,
  filter: { status?: Review["status"]; unitId?: string; unreplied?: boolean } = {},
): Promise<ReviewRow[]> {
  const conditions = [eq(reviews.organizationId, organizationId)];
  if (filter.status) conditions.push(eq(reviews.status, filter.status));
  if (filter.unitId) conditions.push(eq(reviews.unitId, filter.unitId));
  if (filter.unreplied) {
    conditions.push(isNull(reviews.hostReply));
    conditions.push(eq(reviews.status, "published"));
  }
  const rows = await db
    .select({
      review: reviews,
      unitName: units.name,
      propertyName: properties.name,
    })
    .from(reviews)
    .innerJoin(
      units,
      and(
        eq(reviews.unitId, units.id),
        eq(reviews.organizationId, units.organizationId),
      ),
    )
    .innerJoin(
      properties,
      and(
        eq(units.propertyId, properties.id),
        eq(units.organizationId, properties.organizationId),
      ),
    )
    .where(and(...conditions))
    .orderBy(desc(reviews.submittedAt))
    .limit(200);
  return rows.map((row) => ({
    ...row.review,
    unitName: row.unitName,
    propertyName: row.propertyName,
  }));
}

export interface MatchableStay {
  reservationId: string;
  guestName: string;
  checkInDate: string;
  checkOutDate: string;
}

/** Checked-out stays of a unit that have no review yet. */
export async function listMatchableStays(
  organizationId: string,
  unitId: string,
): Promise<MatchableStay[]> {
  const rows = await db
    .select({
      reservationId: reservations.id,
      guestName: guests.name,
      checkInDate: reservations.checkInDate,
      checkOutDate: reservations.checkOutDate,
    })
    .from(reservations)
    .innerJoin(
      guests,
      and(
        eq(reservations.guestId, guests.id),
        eq(reservations.organizationId, guests.organizationId),
      ),
    )
    .where(
      and(
        eq(reservations.organizationId, organizationId),
        eq(reservations.unitId, unitId),
        eq(reservations.status, "checked_out"),
        notExists(
          db
            .select({ one: sql`1` })
            .from(reviews)
            .where(eq(reviews.reservationId, reservations.id)),
        ),
      ),
    )
    .orderBy(desc(reservations.checkOutDate))
    .limit(50);
  return rows;
}

async function getOwnReview(
  tx: Pick<typeof db, "select">,
  organizationId: string,
  reviewId: string,
) {
  const [review] = await tx
    .select()
    .from(reviews)
    .where(
      and(
        eq(reviews.id, reviewId),
        eq(reviews.organizationId, organizationId),
      ),
    )
    .limit(1);
  if (!review) throw new ReviewError("Review not found.", "reviewId");
  return review;
}

export async function replyToReview(input: {
  organizationId: string;
  actorUserId: string;
  reviewId: string;
  reply: string;
}): Promise<void> {
  const reply = cleanText(input.reply, REVIEW_REPLY_MAX, "reply");
  if (!reply) throw new ReviewError("Write a reply first.", "reply");
  await db.transaction(async (tx) => {
    const review = await getOwnReview(tx, input.organizationId, input.reviewId);
    if (review.status === "pending") {
      throw new ReviewError("Approve this review before replying.", "reply");
    }
    const now = new Date();
    await tx
      .update(reviews)
      .set({
        hostReply: reply,
        hostRepliedAt: now,
        hostRepliedBy: input.actorUserId,
        updatedAt: now,
      })
      .where(eq(reviews.id, review.id));
    await tx.insert(auditEvents).values({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      entity: "review",
      entityId: review.id,
      action: review.hostReply ? "review.reply_edited" : "review.replied",
    });
  });
}

/**
 * Publish (approve) or hide a review. Verified reviews publish on their own;
 * hiding one is an explicit, audited host action. A hidden review stays on
 * record and counts for nothing.
 */
export async function setReviewStatus(input: {
  organizationId: string;
  actorUserId: string;
  reviewId: string;
  status: "published" | "hidden";
}): Promise<void> {
  await db.transaction(async (tx) => {
    const review = await getOwnReview(tx, input.organizationId, input.reviewId);
    if (review.status === input.status) return;
    const now = new Date();
    await tx
      .update(reviews)
      .set({
        status: input.status,
        moderatedBy: input.actorUserId,
        moderatedAt: now,
        updatedAt: now,
      })
      .where(eq(reviews.id, review.id));
    await tx.insert(auditEvents).values({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      entity: "review",
      entityId: review.id,
      action:
        input.status === "hidden"
          ? "review.hidden"
          : review.status === "pending"
            ? "review.approved"
            : "review.restored",
      metadata: { kind: review.kind },
    });
  });
}

/**
 * Tie a community review to a real checked-out stay of the same unit. It
 * becomes a verified review: published, with the stay's trust signals.
 */
export async function matchCommunityReview(input: {
  organizationId: string;
  actorUserId: string;
  reviewId: string;
  reservationId: string;
}): Promise<void> {
  await db.transaction(async (tx) => {
    const review = await getOwnReview(tx, input.organizationId, input.reviewId);
    if (review.kind !== "community") {
      throw new ReviewError("Only community reviews can be matched.");
    }
    const [stay] = await tx
      .select({
        unitId: reservations.unitId,
        status: reservations.status,
        source: reservations.source,
        checkInDate: reservations.checkInDate,
        checkOutDate: reservations.checkOutDate,
        actualCheckoutAt: reservations.actualCheckoutAt,
      })
      .from(reservations)
      .where(
        and(
          eq(reservations.id, input.reservationId),
          eq(reservations.organizationId, input.organizationId),
        ),
      )
      .limit(1);
    if (!stay || stay.unitId !== review.unitId || stay.status !== "checked_out") {
      throw new ReviewError(
        "Choose a checked-out stay of this unit.",
        "reservationId",
      );
    }
    const [taken] = await tx
      .select({ id: reviews.id })
      .from(reviews)
      .where(eq(reviews.reservationId, input.reservationId))
      .limit(1);
    if (taken) {
      throw new ReviewError("That stay already has a review.", "reservationId");
    }
    const [payment] = await tx
      .select({ id: paymentEntries.id })
      .from(paymentEntries)
      .where(
        and(
          eq(paymentEntries.reservationId, input.reservationId),
          eq(paymentEntries.organizationId, input.organizationId),
          isNull(paymentEntries.reversalOfId),
        ),
      )
      .limit(1);
    const now = new Date();
    await tx
      .update(reviews)
      .set({
        kind: "verified",
        status: "published",
        reservationId: input.reservationId,
        stayCheckOutAt:
          stay.actualCheckoutAt ?? new Date(`${stay.checkOutDate}T00:00:00Z`),
        stayNights: Math.max(
          1,
          Math.round(
            (Date.parse(stay.checkOutDate) - Date.parse(stay.checkInDate)) /
              86_400_000,
          ),
        ),
        source: stay.source,
        paymentVerified: Boolean(payment),
        moderatedBy: input.actorUserId,
        moderatedAt: now,
        updatedAt: now,
      })
      .where(eq(reviews.id, review.id));
    await tx.insert(auditEvents).values({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      entity: "review",
      entityId: review.id,
      action: "review.matched",
      metadata: { reservationId: input.reservationId },
    });
  });
}

// ---------------------------------------------------------------------------
// Scores and public reads
// ---------------------------------------------------------------------------

function toScorable(row: Review): ScorableReview {
  return {
    kind: row.kind,
    status: row.status,
    rating: row.rating,
    submittedAt: row.submittedAt,
    stayCheckOutAt: row.stayCheckOutAt,
    source: row.source,
    paymentVerified: row.paymentVerified,
  };
}

export interface ReviewSummary {
  score: ReviewScore;
  categories: CategoryScores;
}

/** Scores per unit, plus one roll-up over all the given units (the workspace). */
export async function getReviewSummaries(
  organizationId: string,
  unitIds: readonly string[],
): Promise<{ byUnit: Map<string, ReviewSummary>; overall: ReviewSummary }> {
  const rows =
    unitIds.length === 0
      ? []
      : await db
          .select()
          .from(reviews)
          .where(
            and(
              eq(reviews.organizationId, organizationId),
              inArray(reviews.unitId, [...unitIds]),
              eq(reviews.status, "published"),
            ),
          );
  const now = new Date();
  const summarize = (subset: Review[]): ReviewSummary => ({
    score: scoreReviews(subset.map(toScorable), now),
    categories: categoryAverages(subset),
  });
  const grouped = new Map<string, Review[]>();
  for (const row of rows) {
    const list = grouped.get(row.unitId) ?? [];
    list.push(row);
    grouped.set(row.unitId, list);
  }
  const byUnit = new Map<string, ReviewSummary>();
  for (const id of unitIds) byUnit.set(id, summarize(grouped.get(id) ?? []));
  return { byUnit, overall: summarize(rows) };
}

export interface PublicReview {
  id: string;
  kind: Review["kind"];
  rating: number;
  categoryScores: CategoryScores;
  body: string;
  guestName: string;
  /** "October 2026"; the stay for verified reviews, else when it was written. */
  when: string;
  hostReply: string | null;
  unitName?: string;
}

function monthLabel(date: Date): string {
  return date.toLocaleDateString("en-PH", {
    month: "long",
    year: "numeric",
    timeZone: "Asia/Manila",
  });
}

/**
 * Published reviews for the public pages, for one unit or a whole host.
 * Private feedback is never selected.
 */
export async function listPublicReviews(
  scope: { unitId: string } | { hostSlug: string },
  limit = 50,
): Promise<PublicReview[]> {
  const conditions = [eq(reviews.status, "published")];
  if ("unitId" in scope) conditions.push(eq(reviews.unitId, scope.unitId));
  else conditions.push(eq(organizations.slug, scope.hostSlug));
  const rows = await db
    .select({
      id: reviews.id,
      kind: reviews.kind,
      rating: reviews.rating,
      categoryScores: reviews.categoryScores,
      body: reviews.body,
      guestName: reviews.guestName,
      stayCheckOutAt: reviews.stayCheckOutAt,
      submittedAt: reviews.submittedAt,
      hostReply: reviews.hostReply,
      unitName: units.name,
    })
    .from(reviews)
    .innerJoin(
      units,
      and(
        eq(reviews.unitId, units.id),
        eq(reviews.organizationId, units.organizationId),
      ),
    )
    .innerJoin(organizations, eq(reviews.organizationId, organizations.id))
    .where(and(...conditions, isNull(units.deletedAt)))
    .orderBy(
      // Verified first, then newest.
      sql`(${reviews.kind} = 'verified') DESC`,
      desc(reviews.submittedAt),
    )
    .limit(limit);
  return rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    rating: row.rating,
    categoryScores: row.categoryScores,
    body: row.body,
    guestName: row.guestName,
    when: monthLabel(row.stayCheckOutAt ?? row.submittedAt),
    hostReply: row.hostReply,
    unitName: row.unitName,
  }));
}

export async function countPendingReviews(
  organizationId: string,
): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(reviews)
    .where(
      and(
        eq(reviews.organizationId, organizationId),
        eq(reviews.status, "pending"),
      ),
    );
  return row?.count ?? 0;
}


/** The review a stay received, if any. */
export async function getReservationReview(
  organizationId: string,
  reservationId: string,
): Promise<{ id: string; rating: number; status: Review["status"] } | null> {
  const [row] = await db
    .select({ id: reviews.id, rating: reviews.rating, status: reviews.status })
    .from(reviews)
    .where(
      and(
        eq(reviews.organizationId, organizationId),
        eq(reviews.reservationId, reservationId),
      ),
    )
    .limit(1);
  return row ?? null;
}
