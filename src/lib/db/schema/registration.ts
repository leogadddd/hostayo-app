import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * An early-access link issued by the Hostayo team while sign-up is
 * invite-only (REGISTRATION_INVITE_ONLY). Only the token's digest is
 * persisted. A link admits `maxUses` sign-ups, one by default.
 */
export const registrationInvites = pgTable(
  "registration_invites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tokenHash: text("token_hash").notNull().unique(),
    // Who the link is for. A note for the team; never shown to the invitee.
    label: text("label"),
    maxUses: integer("max_uses").notNull().default(1),
    useCount: integer("use_count").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // The database, not only the service, refuses a sign-up past the limit.
    check(
      "registration_invites_uses_within_limit",
      sql`${table.maxUses} >= 1 AND ${table.useCount} >= 0 AND ${table.useCount} <= ${table.maxUses}`,
    ),
  ],
);

/** One sign-up admitted by an early-access link. */
export const registrationInviteRedemptions = pgTable(
  "registration_invite_redemptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    inviteId: uuid("invite_id").notNull(),
    email: text("email").notNull(),
    redeemedAt: timestamp("redeemed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // Named by hand: the generated name is longer than Postgres's 63 characters.
    foreignKey({
      name: "registration_invite_redemptions_invite_fk",
      columns: [table.inviteId],
      foreignColumns: [registrationInvites.id],
    }).onDelete("cascade"),
    index("registration_invite_redemptions_invite_idx").on(table.inviteId),
  ],
);
