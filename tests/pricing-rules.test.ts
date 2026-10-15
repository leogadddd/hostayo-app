import { describe, expect, it } from "vitest";
import { accommodationLines } from "@/lib/rates";
import {
  estimateRevenue,
  nightlyRateResolver,
  previewNights,
  resolveNightlyRate,
  ruleCoversDate,
  type PricingRuleLike,
} from "@/lib/pricing-rules";

const unit = { id: "u1", propertyId: "p1", nightlyRateCents: 500000 };

function rule(overrides: Partial<PricingRuleLike>): PricingRuleLike {
  return {
    id: "r",
    name: "Rule",
    isActive: true,
    priority: 100,
    stacks: false,
    startDate: null,
    endDate: null,
    repeatsYearly: false,
    weekdays: [],
    adjustmentType: "percent",
    adjustmentValue: 2000,
    appliesToAll: true,
    propertyIds: [],
    unitIds: [],
    ...overrides,
  };
}

describe("pricing rules", () => {
  it("leaves the rate alone without matching rules", () => {
    expect(resolveNightlyRate("2026-12-24", unit, []).cents).toBe(500000);
    expect(
      resolveNightlyRate("2026-12-24", unit, [
        rule({ isActive: false }),
        rule({ appliesToAll: false, unitIds: ["other"] }),
        rule({ startDate: "2027-01-01", endDate: "2027-01-31" }),
      ]).cents,
    ).toBe(500000);
  });

  it("applies percent, amount and fixed adjustments", () => {
    const price = (r: Partial<PricingRuleLike>) =>
      resolveNightlyRate("2026-12-24", unit, [rule(r)]).cents;
    expect(price({ adjustmentType: "percent", adjustmentValue: 2000 })).toBe(
      600000,
    );
    expect(price({ adjustmentType: "percent", adjustmentValue: -1000 })).toBe(
      450000,
    );
    expect(price({ adjustmentType: "amount", adjustmentValue: 50000 })).toBe(
      550000,
    );
    expect(price({ adjustmentType: "fixed", adjustmentValue: 900000 })).toBe(
      900000,
    );
    expect(price({ adjustmentType: "amount", adjustmentValue: -900000 })).toBe(
      0,
    );
  });

  it("builds on the unit's day-of-week rate", () => {
    // 2026-12-25 is a Friday.
    const result = resolveNightlyRate(
      "2026-12-25",
      { ...unit, dayRates: { "5": 700000 } },
      [rule({ adjustmentValue: 1000 })],
    );
    expect(result.cents).toBe(770000);
  });

  it("targets all units, properties or single units", () => {
    const price = (r: Partial<PricingRuleLike>) =>
      resolveNightlyRate("2026-12-24", unit, [rule(r)]).cents;
    expect(price({ appliesToAll: false, propertyIds: ["p1"] })).toBe(600000);
    expect(price({ appliesToAll: false, unitIds: ["u1"] })).toBe(600000);
    expect(price({ appliesToAll: false, propertyIds: ["p2"] })).toBe(500000);
  });

  it("lets only the highest priority non-stacking rule win", () => {
    const rules = [
      rule({
        id: "season",
        name: "Peak",
        priority: 100,
        adjustmentValue: 2000,
      }),
      rule({
        id: "weekend",
        name: "Weekend",
        priority: 200,
        adjustmentType: "fixed",
        adjustmentValue: 900000,
      }),
    ];
    const result = resolveNightlyRate("2026-12-24", unit, rules);
    expect(result.cents).toBe(900000);
    expect(result.applied.map((r) => r.id)).toEqual(["weekend"]);
  });

  it("stacks rules on top of the winner, highest priority first", () => {
    const rules = [
      rule({ id: "peak", priority: 100, adjustmentValue: 2000 }),
      rule({
        id: "weekend",
        priority: 200,
        stacks: true,
        adjustmentType: "amount",
        adjustmentValue: 100000,
      }),
    ];
    const result = resolveNightlyRate("2026-12-24", unit, rules);
    // +20% (600,000) then +1,000.
    expect(result.cents).toBe(700000);
    expect(result.applied.map((r) => r.id)).toEqual(["peak", "weekend"]);
  });

  it("matches weekdays by the day the night starts", () => {
    const weekend = rule({ weekdays: ["5", "6"] });
    expect(ruleCoversDate(weekend, "2026-10-16")).toBe(true); // Friday
    expect(ruleCoversDate(weekend, "2026-10-17")).toBe(true); // Saturday
    expect(ruleCoversDate(weekend, "2026-10-18")).toBe(false); // Sunday
  });

  it("repeats yearly, including ranges that wrap the new year", () => {
    const holidays = rule({
      startDate: "2025-12-15",
      endDate: "2026-01-05",
      repeatsYearly: true,
    });
    expect(ruleCoversDate(holidays, "2031-12-20")).toBe(true);
    expect(ruleCoversDate(holidays, "2031-01-03")).toBe(true);
    expect(ruleCoversDate(holidays, "2031-06-01")).toBe(false);
    const fixed = rule({ startDate: "2026-12-15", endDate: "2026-12-31" });
    expect(ruleCoversDate(fixed, "2027-12-20")).toBe(false);
  });

  it("splits a stay into one charge line per rate", () => {
    const rateFor = nightlyRateResolver(unit, [
      rule({ weekdays: ["5", "6"], adjustmentValue: 3000 }),
    ]);
    const lines = accommodationLines({
      checkIn: "2026-10-15", // Thursday
      nights: 3,
      baseCents: unit.nightlyRateCents,
      rateFor,
    });
    expect(lines.map((line) => [line.quantity, line.unitAmountCents])).toEqual([
      [1, 500000],
      [2, 650000],
    ]);
  });

  it("estimates revenue at an occupancy", () => {
    const nights = previewNights(
      unit,
      [rule({ adjustmentValue: 1000 })],
      "2026-10-01",
      10,
    );
    const estimate = estimateRevenue(nights, 50);
    expect(estimate.fullBaseCents).toBe(5000000);
    expect(estimate.fullCents).toBe(5500000);
    expect(estimate.expectedCents).toBe(2750000);
    expect(estimate.changedNights).toBe(10);
  });
});
