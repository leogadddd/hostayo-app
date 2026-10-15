import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { organizations } from "./orgs";
import type { AdjustmentType } from "@/lib/pricing-rules";
import type { Weekday } from "@/lib/rates";

/**
 * Account-wide pricing rules (see src/lib/pricing-rules.ts). A rule applies to
 * every unit, or to the chosen properties and units; property and unit ids
 * live in jsonb so a rule on a property also covers units added later.
 */
export const pricingRules = pgTable(
  "pricing_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    // Higher wins among rules that don't stack.
    priority: integer("priority").notNull().default(100),
    stacks: boolean("stacks").notNull().default(false),
    // Local dates (YYYY-MM-DD) as text; both null means every date.
    startDate: text("start_date"),
    endDate: text("end_date"),
    repeatsYearly: boolean("repeats_yearly").notNull().default(false),
    weekdays: jsonb("weekdays").$type<Weekday[]>().notNull().default([]),
    adjustmentType: text("adjustment_type").$type<AdjustmentType>().notNull(),
    // Basis points ("percent"), or centavos ("amount", "fixed").
    adjustmentValue: integer("adjustment_value").notNull(),
    appliesToAll: boolean("applies_to_all").notNull().default(true),
    propertyIds: jsonb("property_ids").$type<string[]>().notNull().default([]),
    unitIds: jsonb("unit_ids").$type<string[]>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("pricing_rules_org_idx").on(table.organizationId, table.isActive),
    check(
      "pricing_rules_name_length",
      sql`char_length(trim(${table.name})) BETWEEN 2 AND 80`,
    ),
    check(
      "pricing_rules_adjustment_check",
      sql`${table.adjustmentType} IN ('percent', 'amount', 'fixed')
        AND (${table.adjustmentType} <> 'fixed' OR ${table.adjustmentValue} >= 0)`,
    ),
    check(
      "pricing_rules_dates_check",
      sql`${table.startDate} IS NULL OR ${table.endDate} IS NULL OR ${table.startDate} <= ${table.endDate}
        OR ${table.repeatsYearly}`,
    ),
  ],
);

export type PricingRule = typeof pricingRules.$inferSelect;
