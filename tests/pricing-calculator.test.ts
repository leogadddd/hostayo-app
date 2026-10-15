import { describe, expect, it } from "vitest";
import {
  DEFAULT_INPUTS,
  occupancyFor,
  positionAt,
  rateFor,
  tidyRate,
  weekdayWeekendRates,
  type CalculatorInputs,
} from "@/lib/pricing-calculator";

const inputs: CalculatorInputs = {
  ...DEFAULT_INPUTS,
  fixedMonthly: 30000,
  costPerStay: 500,
  cleaningFeeCharged: 400,
  feePercent: 10,
  avgStayNights: 2,
  occupancyPercent: 60,
  targetProfit: 15000,
};

describe("pricing calculator", () => {
  it("finds the rate that earns the target profit", () => {
    const rate = rateFor(inputs, inputs.targetProfit)!;
    expect(positionAt(inputs, rate).profit).toBeCloseTo(15000, 4);
  });

  it("finds the break-even rate and occupancy", () => {
    const rate = rateFor(inputs, 0)!;
    expect(positionAt(inputs, rate).profit).toBeCloseTo(0, 4);
    expect(occupancyFor(inputs, rate)).toBeCloseTo(60, 4);
  });

  it("splits the average rate into weekday and weekend rates", () => {
    const { weekday, weekend } = weekdayWeekendRates(3000, 20);
    expect(weekend / weekday).toBeCloseTo(1.2, 6);
    expect((5 * weekday + 2 * weekend) / 7).toBeCloseTo(3000, 6);
  });

  it("copes with nothing booked and rates that can't pay", () => {
    expect(rateFor({ ...inputs, occupancyPercent: 0 }, 0)).toBeNull();
    expect(occupancyFor(inputs, 0)).toBeNull();
    expect(positionAt(inputs, 2000, 0).marginPercent).toBeNull();
  });

  it("rounds rates up to the next fifty", () => {
    expect(tidyRate(2347)).toBe(2350);
    expect(tidyRate(2350)).toBe(2350);
  });
});
