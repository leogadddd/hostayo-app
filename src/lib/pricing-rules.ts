import { addDaysLocal } from "@/lib/dates";
import {
  nightlyRateFor,
  weekdayOf,
  type DayRates,
  type Weekday,
} from "@/lib/rates";

/**
 * Account-wide pricing rules, layered on a unit's regular nightly rate and its
 * day-of-week rates.
 *
 * A rule matches a night when it is active, applies to the unit (all units,
 * the unit's property, or the unit itself), the night falls inside its dates
 * (when it has any) and on one of its weekdays (when it has any). Among the
 * matching rules:
 *
 * - Priority rules (`stacks` false) compete: only the highest priority wins.
 * - Stacking rules always apply on top, highest priority first.
 *
 * A night is priced by the day it starts, like day-of-week rates.
 */

export type AdjustmentType = "percent" | "amount" | "fixed";

export const ADJUSTMENT_LABELS: Record<AdjustmentType, string> = {
  percent: "Percent of the rate",
  amount: "Add or subtract an amount",
  fixed: "Set a fixed nightly price",
};

export const DEFAULT_RULE_PRIORITY = 100;

export interface PricingRuleLike {
  id: string;
  name: string;
  isActive: boolean;
  priority: number;
  stacks: boolean;
  /** Local dates "YYYY-MM-DD", inclusive; both null means every date. */
  startDate: string | null;
  endDate: string | null;
  /** Repeat the date range every year (the year in the dates is ignored). */
  repeatsYearly: boolean;
  /** Empty means every day of the week. */
  weekdays: readonly Weekday[];
  adjustmentType: AdjustmentType;
  /**
   * "percent": basis points added to the rate (+2000 = +20%, -1000 = -10%).
   * "amount": centavos added to the rate (negative subtracts).
   * "fixed": the nightly price in centavos.
   */
  adjustmentValue: number;
  appliesToAll: boolean;
  propertyIds: readonly string[];
  unitIds: readonly string[];
}

export interface PricedUnit {
  id: string;
  propertyId: string;
  nightlyRateCents: number;
  dayRates?: DayRates | null;
}

export interface AppliedRule {
  id: string;
  name: string;
}

export function ruleAppliesToUnit(
  rule: Pick<PricingRuleLike, "appliesToAll" | "propertyIds" | "unitIds">,
  unit: Pick<PricedUnit, "id" | "propertyId">,
): boolean {
  return (
    rule.appliesToAll ||
    rule.unitIds.includes(unit.id) ||
    rule.propertyIds.includes(unit.propertyId)
  );
}

function monthDay(date: string): string {
  return date.slice(5);
}

export function ruleCoversDate(
  rule: Pick<
    PricingRuleLike,
    "startDate" | "endDate" | "repeatsYearly" | "weekdays"
  >,
  date: string,
): boolean {
  if (rule.weekdays.length > 0 && !rule.weekdays.includes(weekdayOf(date)))
    return false;
  const { startDate, endDate } = rule;
  if (!startDate && !endDate) return true;
  if (rule.repeatsYearly && startDate && endDate) {
    const start = monthDay(startDate);
    const end = monthDay(endDate);
    const day = monthDay(date);
    // A range like Dec 15 – Jan 5 wraps around the new year.
    return start <= end
      ? day >= start && day <= end
      : day >= start || day <= end;
  }
  if (startDate && date < startDate) return false;
  if (endDate && date > endDate) return false;
  return true;
}

export function applyAdjustment(
  cents: number,
  rule: Pick<PricingRuleLike, "adjustmentType" | "adjustmentValue">,
): number {
  const next =
    rule.adjustmentType === "percent"
      ? cents + Math.round((cents * rule.adjustmentValue) / 10000)
      : rule.adjustmentType === "amount"
        ? cents + rule.adjustmentValue
        : rule.adjustmentValue;
  return Math.max(0, next);
}

/** Highest priority first; the name keeps equal priorities in a stable order. */
function byPriority(a: PricingRuleLike, b: PricingRuleLike): number {
  return b.priority - a.priority || a.name.localeCompare(b.name);
}

/** The rules that price this unit on this night, in the order they apply. */
export function matchingRules(
  date: string,
  unit: Pick<PricedUnit, "id" | "propertyId">,
  rules: readonly PricingRuleLike[],
): PricingRuleLike[] {
  const matching = rules.filter(
    (rule) =>
      rule.isActive &&
      ruleAppliesToUnit(rule, unit) &&
      ruleCoversDate(rule, date),
  );
  const winner = matching.filter((rule) => !rule.stacks).sort(byPriority)[0];
  const stacked = matching.filter((rule) => rule.stacks).sort(byPriority);
  return winner ? [winner, ...stacked] : stacked;
}

export function resolveNightlyRate(
  date: string,
  unit: PricedUnit,
  rules: readonly PricingRuleLike[],
): { cents: number; applied: AppliedRule[] } {
  let cents = nightlyRateFor(date, unit.nightlyRateCents, unit.dayRates);
  const applied = matchingRules(date, unit, rules);
  for (const rule of applied) cents = applyAdjustment(cents, rule);
  return {
    cents,
    applied: applied.map((rule) => ({ id: rule.id, name: rule.name })),
  };
}

/** A per-night rate lookup for `accommodationLines`, or undefined without rules. */
export function nightlyRateResolver(
  unit: PricedUnit,
  rules: readonly PricingRuleLike[] | null | undefined,
): ((date: string) => number) | undefined {
  const active = (rules ?? []).filter(
    (rule) => rule.isActive && ruleAppliesToUnit(rule, unit),
  );
  if (active.length === 0) return undefined;
  return (date) => resolveNightlyRate(date, unit, active).cents;
}

/** The resolver for a unit as stored (`defaultNightlyRateCents` and friends). */
export function unitRateResolver(
  unit: {
    id: string;
    propertyId: string;
    defaultNightlyRateCents: number;
    dayRates: DayRates | null;
  },
  rules: readonly PricingRuleLike[] | null | undefined,
): ((date: string) => number) | undefined {
  return nightlyRateResolver(
    {
      id: unit.id,
      propertyId: unit.propertyId,
      nightlyRateCents: unit.defaultNightlyRateCents,
      dayRates: unit.dayRates,
    },
    rules,
  );
}

export interface PreviewNight {
  date: string;
  baseCents: number;
  cents: number;
  applied: AppliedRule[];
}

/** Every night from `from` for `days` days, priced with and without the rules. */
export function previewNights(
  unit: PricedUnit,
  rules: readonly PricingRuleLike[],
  from: string,
  days: number,
): PreviewNight[] {
  return Array.from({ length: days }, (_, index) => {
    const date = addDaysLocal(from, index);
    const resolved = resolveNightlyRate(date, unit, rules);
    return {
      date,
      baseCents: nightlyRateFor(date, unit.nightlyRateCents, unit.dayRates),
      cents: resolved.cents,
      applied: resolved.applied,
    };
  });
}

export interface RevenueEstimate {
  /** Nights priced, and how many of those a rule changed. */
  nights: number;
  changedNights: number;
  averageCents: number;
  lowestCents: number;
  highestCents: number;
  /** Revenue if every night were booked. */
  fullCents: number;
  fullBaseCents: number;
  /** Revenue at the assumed occupancy (0–100). */
  expectedCents: number;
  expectedBaseCents: number;
}

export function estimateRevenue(
  nights: readonly PreviewNight[],
  occupancyPercent: number,
): RevenueEstimate {
  const rates = nights.map((night) => night.cents);
  const full = rates.reduce((sum, cents) => sum + cents, 0);
  const fullBase = nights.reduce((sum, night) => sum + night.baseCents, 0);
  const share = Math.min(100, Math.max(0, occupancyPercent)) / 100;
  return {
    nights: nights.length,
    changedNights: nights.filter((night) => night.cents !== night.baseCents)
      .length,
    averageCents: nights.length ? Math.round(full / nights.length) : 0,
    lowestCents: rates.length ? Math.min(...rates) : 0,
    highestCents: rates.length ? Math.max(...rates) : 0,
    fullCents: full,
    fullBaseCents: fullBase,
    expectedCents: Math.round(full * share),
    expectedBaseCents: Math.round(fullBase * share),
  };
}

const WEEKDAY_SHORT: Record<Weekday, string> = {
  "0": "Sun",
  "1": "Mon",
  "2": "Tue",
  "3": "Wed",
  "4": "Thu",
  "5": "Fri",
  "6": "Sat",
};

/** "+20%", "−₱500" or "₱9,000 flat" for rule lists. */
export function adjustmentLabel(
  rule: Pick<PricingRuleLike, "adjustmentType" | "adjustmentValue">,
  format: (cents: number) => string,
): string {
  const { adjustmentType, adjustmentValue } = rule;
  if (adjustmentType === "fixed") return `${format(adjustmentValue)} flat`;
  const sign = adjustmentValue < 0 ? "−" : "+";
  if (adjustmentType === "percent")
    return `${sign}${Math.abs(adjustmentValue) / 100}%`;
  return `${sign}${format(Math.abs(adjustmentValue))}`;
}

const MONTH_DAY = new Intl.DateTimeFormat("en-PH", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});
const MONTH_DAY_YEAR = new Intl.DateTimeFormat("en-PH", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

/** "Dec 15 – Jan 5 every year · Fri, Sat" style description of when a rule applies. */
export function ruleWhenLabel(
  rule: Pick<
    PricingRuleLike,
    "startDate" | "endDate" | "repeatsYearly" | "weekdays"
  >,
): string {
  const parts: string[] = [];
  const { startDate, endDate } = rule;
  if (startDate || endDate) {
    const formatter = rule.repeatsYearly ? MONTH_DAY : MONTH_DAY_YEAR;
    const show = (date: string) =>
      formatter.format(new Date(`${date}T00:00:00Z`));
    const range =
      startDate && endDate
        ? startDate === endDate
          ? show(startDate)
          : `${show(startDate)} – ${show(endDate)}`
        : startDate
          ? `From ${show(startDate)}`
          : `Until ${show(endDate!)}`;
    parts.push(rule.repeatsYearly ? `${range} every year` : range);
  }
  if (rule.weekdays.length > 0) {
    const order: Weekday[] = ["1", "2", "3", "4", "5", "6", "0"];
    parts.push(
      order
        .filter((day) => rule.weekdays.includes(day))
        .map((day) => WEEKDAY_SHORT[day])
        .join(", "),
    );
  }
  return parts.length ? parts.join(" · ") : "Every night";
}
