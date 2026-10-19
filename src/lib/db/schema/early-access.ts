import {
  foreignKey,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { registrationInvites } from "./registration";

/**
 * A request from the marketing site's early-access form, kept here so it
 * survives a failed email. Only L1 operators read these. `readAt` stays null
 * until someone opens or marks the request, which is what "new" means.
 */
export const earlyAccessRequests = pgTable(
  "early_access_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    // Facebook or Instagram link or handle, for a faster reply.
    social: text("social").notNull(),
    units: text("units").notNull(),
    source: text("source").notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    // Set when an operator accepts the request: a sign-up link was made.
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    // The link made on accept. Replaced when the invite is sent again.
    inviteId: uuid("invite_id"),
    // Null while accepted means the welcome email did not go out.
    welcomeSentAt: timestamp("welcome_sent_at", { withTimezone: true }),
    // The account created with this entry's link. Revoking early access blocks it.
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("early_access_requests_created_idx").on(table.createdAt),
    foreignKey({
      name: "early_access_requests_invite_fk",
      columns: [table.inviteId],
      foreignColumns: [registrationInvites.id],
    }).onDelete("set null"),
  ],
);
