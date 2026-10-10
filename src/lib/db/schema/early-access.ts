import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

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
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("early_access_requests_created_idx").on(table.createdAt)],
);
