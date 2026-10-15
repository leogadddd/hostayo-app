import "server-only";

import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { auditEvents, pricingRules } from "@/lib/db/schema";
import { isLocalDate } from "@/lib/dates";
import type { PricingRuleLike } from "@/lib/pricing-rules";

export class PricingRuleError extends Error {
  constructor(
    message: string,
    readonly field?: string,
  ) {
    super(message);
    this.name = "PricingRuleError";
  }
}

const dateField = z
  .string()
  .trim()
  .optional()
  .transform((value) => value || null)
  .refine((value) => value === null || isLocalDate(value), "Use a valid date.");

export const pricingRuleInputSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Rule names need at least 2 characters.")
      .max(80, "Rule names must be 80 characters or fewer."),
    isActive: z.boolean().default(true),
    priority: z
      .number()
      .int("Priority must be a whole number.")
      .min(0, "Priority can't be negative.")
      .max(100000, "Priority is too large."),
    stacks: z.boolean().default(false),
    startDate: dateField,
    endDate: dateField,
    repeatsYearly: z.boolean().default(false),
    weekdays: z.array(z.enum(["0", "1", "2", "3", "4", "5", "6"])).default([]),
    adjustmentType: z.enum(["percent", "amount", "fixed"]),
    adjustmentValue: z
      .number()
      .int("Enter a whole adjustment.")
      .min(-100000000)
      .max(100000000),
    appliesToAll: z.boolean().default(true),
    propertyIds: z.array(z.string().uuid()).default([]),
    unitIds: z.array(z.string().uuid()).default([]),
  })
  .superRefine((value, ctx) => {
    if (Boolean(value.startDate) !== Boolean(value.endDate))
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "Set both the first and last date, or leave both empty.",
      });
    if (
      value.startDate &&
      value.endDate &&
      !value.repeatsYearly &&
      value.startDate > value.endDate
    )
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "The last date can't be before the first.",
      });
    if (value.repeatsYearly && !value.startDate)
      ctx.addIssue({
        code: "custom",
        path: ["startDate"],
        message: "Pick the dates that repeat each year.",
      });
    if (value.adjustmentType === "fixed" && value.adjustmentValue < 0)
      ctx.addIssue({
        code: "custom",
        path: ["adjustmentValue"],
        message: "A fixed price can't be negative.",
      });
    if (value.adjustmentType === "percent" && value.adjustmentValue < -10000)
      ctx.addIssue({
        code: "custom",
        path: ["adjustmentValue"],
        message: "A discount can't be more than 100%.",
      });
    if (
      !value.appliesToAll &&
      value.propertyIds.length === 0 &&
      value.unitIds.length === 0
    )
      ctx.addIssue({
        code: "custom",
        path: ["appliesToAll"],
        message: "Choose all units, or pick at least one property or unit.",
      });
  });

export type PricingRuleInput = z.input<typeof pricingRuleInputSchema>;

export type ManagedPricingRule = PricingRuleLike & {
  createdAt: Date;
};

function toRule(row: typeof pricingRules.$inferSelect): ManagedPricingRule {
  return {
    id: row.id,
    name: row.name,
    isActive: row.isActive,
    priority: row.priority,
    stacks: row.stacks,
    startDate: row.startDate,
    endDate: row.endDate,
    repeatsYearly: row.repeatsYearly,
    weekdays: row.weekdays,
    adjustmentType: row.adjustmentType,
    adjustmentValue: row.adjustmentValue,
    appliesToAll: row.appliesToAll,
    propertyIds: row.propertyIds,
    unitIds: row.unitIds,
    createdAt: row.createdAt,
  };
}

/** Every rule, active ones first, highest priority first. */
export async function listPricingRules(
  organizationId: string,
  options: { activeOnly?: boolean } = {},
): Promise<ManagedPricingRule[]> {
  const rows = await db
    .select()
    .from(pricingRules)
    .where(
      options.activeOnly
        ? and(
            eq(pricingRules.organizationId, organizationId),
            eq(pricingRules.isActive, true),
          )
        : eq(pricingRules.organizationId, organizationId),
    )
    .orderBy(
      desc(pricingRules.isActive),
      desc(pricingRules.priority),
      asc(pricingRules.name),
    );
  return rows.map(toRule);
}

export async function getPricingRule(
  organizationId: string,
  ruleId: string,
): Promise<ManagedPricingRule | null> {
  const [row] = await db
    .select()
    .from(pricingRules)
    .where(
      and(
        eq(pricingRules.id, ruleId),
        eq(pricingRules.organizationId, organizationId),
      ),
    )
    .limit(1);
  return row ? toRule(row) : null;
}

function values(data: z.output<typeof pricingRuleInputSchema>) {
  return {
    ...data,
    // Targets only matter when the rule isn't for everything.
    propertyIds: data.appliesToAll ? [] : [...new Set(data.propertyIds)],
    unitIds: data.appliesToAll ? [] : [...new Set(data.unitIds)],
    repeatsYearly: data.startDate ? data.repeatsYearly : false,
  };
}

async function audit(
  organizationId: string,
  actorUserId: string,
  ruleId: string,
  action: string,
  metadata: Record<string, unknown>,
) {
  await db.insert(auditEvents).values({
    organizationId,
    actorUserId,
    entity: "pricing_rule",
    entityId: ruleId,
    action,
    metadata,
  });
}

export async function createPricingRule(input: {
  organizationId: string;
  actorUserId: string;
  data: PricingRuleInput;
}) {
  const data = values(pricingRuleInputSchema.parse(input.data));
  const [rule] = await db
    .insert(pricingRules)
    .values({ organizationId: input.organizationId, ...data })
    .returning();
  await audit(
    input.organizationId,
    input.actorUserId,
    rule!.id,
    "pricing_rule.created",
    {
      name: data.name,
      adjustmentType: data.adjustmentType,
      priority: data.priority,
    },
  );
  return rule!;
}

export async function updatePricingRule(input: {
  organizationId: string;
  actorUserId: string;
  ruleId: string;
  data: PricingRuleInput;
}) {
  const data = values(pricingRuleInputSchema.parse(input.data));
  const [rule] = await db
    .update(pricingRules)
    .set({ ...data, updatedAt: new Date() })
    .where(
      and(
        eq(pricingRules.id, input.ruleId),
        eq(pricingRules.organizationId, input.organizationId),
      ),
    )
    .returning();
  if (!rule)
    throw new PricingRuleError(
      "That pricing rule no longer exists. Refresh and try again.",
    );
  await audit(
    input.organizationId,
    input.actorUserId,
    rule.id,
    "pricing_rule.updated",
    {
      name: data.name,
      adjustmentType: data.adjustmentType,
      priority: data.priority,
    },
  );
  return rule;
}

export async function setPricingRuleActive(input: {
  organizationId: string;
  actorUserId: string;
  ruleId: string;
  isActive: boolean;
}) {
  const [rule] = await db
    .update(pricingRules)
    .set({ isActive: input.isActive, updatedAt: new Date() })
    .where(
      and(
        eq(pricingRules.id, input.ruleId),
        eq(pricingRules.organizationId, input.organizationId),
      ),
    )
    .returning();
  if (!rule)
    throw new PricingRuleError(
      "That pricing rule no longer exists. Refresh and try again.",
    );
  await audit(
    input.organizationId,
    input.actorUserId,
    rule.id,
    input.isActive ? "pricing_rule.activated" : "pricing_rule.deactivated",
    { name: rule.name },
  );
  return rule;
}

export async function deletePricingRule(input: {
  organizationId: string;
  actorUserId: string;
  ruleId: string;
}) {
  const [rule] = await db
    .delete(pricingRules)
    .where(
      and(
        eq(pricingRules.id, input.ruleId),
        eq(pricingRules.organizationId, input.organizationId),
      ),
    )
    .returning();
  if (!rule)
    throw new PricingRuleError(
      "That pricing rule no longer exists. Refresh and try again.",
    );
  await audit(
    input.organizationId,
    input.actorUserId,
    rule.id,
    "pricing_rule.deleted",
    {
      name: rule.name,
    },
  );
}
