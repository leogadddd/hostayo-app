import { describe, expect, it } from "vitest";
import {
  comparePlatforms,
  investmentResult,
  propertyResult,
  suggestSeasons,
  type PropertyInputs,
} from "@/lib/tool-calcs";

const unit = {
  name: "Unit A",
  rate: 3000,
  occupancyPercent: 60,
  avgStayNights: 2,
  costPerStay: 500,
  cleaningFeeCharged: 400,
};

describe("property break-even", () => {
  const property: PropertyInputs = {
    sharedFixedMonthly: 40000,
    feePercent: 10,
    daysInMonth: 30,
    units: [unit, { ...unit, name: "Unit B", rate: 4000 }],
  };

  it("adds up units and takes off shared costs", () => {
    const result = propertyResult(property);
    // Each unit: 18 nights, 9 stays.
    const a = 3000 * 18 + 400 * 9; // revenue
    const profitA = a * 0.9 - 500 * 9;
    const b = 4000 * 18 + 400 * 9;
    const profitB = b * 0.9 - 500 * 9;
    expect(result.revenue).toBeCloseTo(a + b, 6);
    expect(result.profit).toBeCloseTo(profitA + profitB - 40000, 6);
  });

  it("finds the occupancy where the property breaks even", () => {
    const result = propertyResult(property);
    const at = propertyResult({
      ...property,
      units: property.units.map((u) => ({
        ...u,
        occupancyPercent: result.breakEvenOccupancy!,
      })),
    });
    expect(at.profit).toBeCloseTo(0, 4);
  });
});

describe("platform comparison", () => {
  it("shows what each platform leaves you", () => {
    const rows = comparePlatforms({
      nightlyRate: 3000,
      nights: 2,
      cleaningFee: 500,
      platforms: [
        { name: "Direct", feePercent: 0 },
        { name: "Booking", feePercent: 15 },
      ],
    });
    expect(rows[0]).toMatchObject({
      guestPays: 6500,
      youKeep: 6500,
      behindBest: 0,
    });
    expect(rows[1]!.youKeep).toBeCloseTo(5525, 6);
    expect(rows[1]!.behindBest).toBeCloseTo(975, 6);
    expect(rows[1]!.priceToMatchBest * 0.85).toBeCloseTo(6500, 6);
  });
});

describe("seasonal planner", () => {
  it("raises busy months and cuts slow ones, in steps of 5", () => {
    const occupancy = Array(12).fill(70);
    occupancy[11] = 95; // December
    occupancy[5] = 30; // June
    const plan = suggestSeasons({
      baseRate: 3000,
      targetOccupancy: 70,
      occupancyByMonth: occupancy,
    });
    expect(plan[0]).toMatchObject({ adjustmentPercent: 0, label: "steady" });
    expect(plan[11]).toMatchObject({
      adjustmentPercent: 15,
      rate: 3450,
      label: "peak",
    });
    expect(plan[5]).toMatchObject({
      adjustmentPercent: -20,
      rate: 2400,
      label: "slow",
    });
  });

  it("limits the swing", () => {
    const plan = suggestSeasons({
      baseRate: 1000,
      targetOccupancy: 40,
      occupancyByMonth: Array(12).fill(100),
    });
    expect(plan[0]!.adjustmentPercent).toBe(30);
  });
});

describe("investment payback", () => {
  const base = {
    upfrontCash: 1_200_000,
    loanMonthly: 20000,
    otherFixedMonthly: 10000,
    rate: 3500,
    occupancyPercent: 60,
    avgStayNights: 2,
    costPerStay: 500,
    cleaningFeeCharged: 400,
    feePercent: 10,
  };

  it("works out profit, return and payback", () => {
    const result = investmentResult(base);
    const revenue = 3500 * 18 + 400 * 9;
    const profit = revenue * 0.9 - 500 * 9 - 30000;
    expect(result.monthlyProfit).toBeCloseTo(profit, 6);
    expect(result.paybackMonths).toBeCloseTo(1_200_000 / profit, 6);
    expect(result.annualReturnPercent).toBeCloseTo(
      ((profit * 12) / 1_200_000) * 100,
      6,
    );
  });

  it("has no payback when it loses money", () => {
    const result = investmentResult({ ...base, rate: 500 });
    expect(result.monthlyProfit).toBeLessThan(0);
    expect(result.paybackMonths).toBeNull();
  });
});
