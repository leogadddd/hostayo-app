import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { organizations } from "./orgs";
import { units } from "./inventory";
import { reservations } from "./reservations";
import type {
  CategoryScores,
  ReviewKind,
  ReviewStatus,
} from "@/lib/reviews";

/**
 * Guest reviews of a unit (see src/lib/reviews.ts for how they are scored).
 *
 * `verified` reviews come from a review link tied to one checked-out
 * reservation and publish immediately. `community` reviews come from the open
 * link on the public unit page, wait as `pending` until a host approves them,
 * and count for very little. Hosts can reply and hide, never edit or delete.
 *
 * The scoring signals (`source`, `payment_verified`, `stay_check_out_at`) are
 * snapshotted when the review is written, so scores can be recomputed with a
 * new algorithm version without the original reservation.
 */
export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    unitId: uuid("unit_id").notNull(),
    // Null for community reviews until a host matches one to a stay. Reservations
    // are cancelled, not deleted, so the cascade only affects the demo reset.
    reservationId: uuid("reservation_id"),
    kind: text("kind").$type<ReviewKind>().notNull(),
    status: text("status").$type<ReviewStatus>().notNull(),
    rating: smallint("rating").notNull(),
    categoryScores: jsonb("category_scores")
      .$type<CategoryScores>()
      .notNull()
      .default({}),
    body: text("body").notNull().default(""),
    // Only the host team sees this; never shown publicly.
    privateFeedback: text("private_feedback"),
    guestName: text("guest_name").notNull(),
    stayCheckOutAt: timestamp("stay_check_out_at", { withTimezone: true }),
    stayNights: integer("stay_nights"),
    source: text("source"),
    paymentVerified: boolean("payment_verified"),
    // Salted hash of the reviewer's network and browser, to limit community
    // reviews to one per person per unit. Never shown.
    fingerprintHash: text("fingerprint_hash"),
    hostReply: text("host_reply"),
    hostRepliedAt: timestamp("host_replied_at", { withTimezone: true }),
    hostRepliedBy: text("host_replied_by").references(() => user.id, {
      onDelete: "set null",
    }),
    moderatedBy: text("moderated_by").references(() => user.id, {
      onDelete: "set null",
    }),
    moderatedAt: timestamp("moderated_at", { withTimezone: true }),
    submittedAt: timestamp("submitted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("reviews_organization_id_unique").on(
      table.organizationId,
      table.id,
    ),
    // One review per stay.
    uniqueIndex("reviews_reservation_unique")
      .on(table.reservationId)
      .where(sql`${table.reservationId} IS NOT NULL`),
    index("reviews_unit_status_idx").on(
      table.organizationId,
      table.unitId,
      table.status,
    ),
    index("reviews_fingerprint_idx").on(
      table.unitId,
      table.fingerprintHash,
      table.submittedAt,
    ),
    foreignKey({
      columns: [table.organizationId, table.unitId],
      foreignColumns: [units.organizationId, units.id],
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.organizationId, table.reservationId],
      foreignColumns: [reservations.organizationId, reservations.id],
    }).onDelete("cascade"),
    check("reviews_rating_check", sql`${table.rating} BETWEEN 1 AND 5`),
    check("reviews_kind_check", sql`${table.kind} IN ('verified', 'community')`),
    check(
      "reviews_status_check",
      sql`${table.status} IN ('pending', 'published', 'hidden')`,
    ),
    check(
      "reviews_verified_has_stay_check",
      sql`${table.kind} <> 'verified' OR ${table.reservationId} IS NOT NULL`,
    ),
    check(
      "reviews_guest_name_length",
      sql`char_length(trim(${table.guestName})) BETWEEN 1 AND 60`,
    ),
    check("reviews_body_length", sql`char_length(${table.body}) <= 2000`),
  ],
);

export type Review = typeof reviews.$inferSelect;

/**
 * Review links the owner shares after a stay. Same shape as `access_tokens`
 * (only the SHA-256 of the token is stored) but a separate table, so a
 * review link can never open the booking-status page, and the welcome link
 * logic never sees it.
 */
export const reviewLinks = pgTable(
  "review_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    reservationId: uuid("reservation_id").notNull(),
    tokenHash: text("token_hash").notNull(),
    createdBy: text("created_by").references(() => user.id, {
      onDelete: "set null",
    }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("review_links_token_hash_unique").on(table.tokenHash),
    index("review_links_reservation_idx").on(
      table.organizationId,
      table.reservationId,
    ),
    foreignKey({
      columns: [table.organizationId, table.reservationId],
      foreignColumns: [reservations.organizationId, reservations.id],
    }).onDelete("cascade"),
  ],
);
