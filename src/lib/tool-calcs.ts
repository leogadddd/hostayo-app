import {
  positionAt,
  type CalculatorInputs,
  DEFAULT_INPUTS,
} from "@/lib/pricing-calculator";

/**
 * Maths behind the planning tools under /tools. Standalone estimates; nothing
 * here touches real data. Amounts are pesos as typed.
 */

// --- Whole-property break-even -------------------------------------------

export interface UnitScenario {
  name: string;
  rate: number;
  occupancyPercent: number;
  avgStayNights: number;
  costPerStay: number;
  cleaningFeeCharged: number;
}

export interface PropertyInputs {
  /** Costs shared by all units: building dues, utilities, staff, internet. */
  sharedFixedMonthly: number;
  feePercent: number;
  daysInMonth: number;
  units: UnitScenario[];
}

function unitInputs(
  property: PropertyInputs,
  unit: UnitScenario,
): CalculatorInputs {
  return {
    ...DEFAULT_INPUTS,
    fixedMonthly: 0,
    costPerStay: unit.costPerStay,
    cleaningFeeCharged: unit.cleaningFeeCharged,
    feePercent: property.feePercent,
    avgStayNights: unit.avgStayNights,
    occupancyPercent: unit.occupancyPercent,
    daysInMonth: property.daysInMonth,
  };
}

export interface PropertyResult {
  units: { name: string; revenue: number; profitBeforeShared: number }[];
  revenue: number;
  profit: number;
  marginPercent: number | null;
  /**
   * The occupancy every unit would need, all the same, to cover the shared
   * costs; null when the units can't cover them at any occupancy.
   */
  breakEvenOccupancy: number | null;
}

export function propertyResult(property: PropertyInputs): PropertyResult {
  const units = property.units.map((unit) => {
    const inputs = unitInputs(property, unit);
    const position = positionAt(inputs, unit.rate);
    return {
      name: unit.name,
      revenue: position.revenue,
      profitBeforeShared: position.profit,
    };
  });
  const revenue = units.reduce((sum, unit) => sum + unit.revenue, 0);
  const profit =
    units.reduce((sum, unit) => sum + unit.profitBeforeShared, 0) -
    property.sharedFixedMonthly;
  // Profit rises in a straight line with occupancy, so two points find the zero.
  const full = property.units.reduce(
    (sum, unit) =>
      sum + positionAt(unitInputs(property, unit), unit.rate, 100).profit,
    0,
  );
  const empty = 0;
  const slope = (full - empty) / 100;
  return {
    units,
    revenue,
    profit,
    marginPercent: revenue > 0 ? (profit / revenue) * 100 : null,
    breakEvenOccupancy: slope > 0 ? property.sharedFixedMonthly / slope : null,
  };
}

// --- Platform fee comparison ----------------------------------------------

export interface PlatformScenario {
  name: string;
  /** What the host pays, as a percent of what the guest pays. */
  feePercent: number;
}

export const DEFAULT_PLATFORMS: PlatformScenario[] = [
  { name: "Airbnb", feePercent: 3 },
  { name: "Booking.com", feePercent: 15 },
  { name: "Agoda", feePercent: 18 },
  { name: "Direct (card or e-wallet)", feePercent: 2.5 },
  { name: "Direct (bank transfer)", feePercent: 0 },
];

export interface FeeComparisonRow {
  name: string;
  feePercent: number;
  guestPays: number;
  fee: number;
  youKeep: number;
  /** Compared with the best row, per booking. */
  behindBest: number;
  /** The guest price that would leave the same take-home as the best row. */
  priceToMatchBest: number;
}

export function comparePlatforms(input: {
  nightlyRate: number;
  nights: number;
  cleaningFee: number;
  platforms: PlatformScenario[];
}): FeeComparisonRow[] {
  const guestPays = input.nightlyRate * input.nights + input.cleaningFee;
  const rows = input.platforms.map((platform) => {
    const fee = (guestPays * platform.feePercent) / 100;
    return { platform, fee, youKeep: guestPays - fee };
  });
  const best = Math.max(0, ...rows.map((row) => row.youKeep));
  return rows.map(({ platform, fee, youKeep }) => ({
    name: platform.name,
    feePercent: platform.feePercent,
    guestPays,
    fee,
    youKeep,
    behindBest: best - youKeep,
    priceToMatchBest:
      platform.feePercent < 100 ? best / (1 - platform.feePercent / 100) : 0,
  }));
}

// --- Seasonal rate planner -------------------------------------------------

export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export type SeasonLabel = "peak" | "high" | "steady" | "slow";

export interface MonthSuggestion {
  month: string;
  occupancyPercent: number;
  /** Suggested change to the base rate, in whole percent, in steps of 5. */
  adjustmentPercent: number;
  rate: number;
  label: SeasonLabel;
}

/**
 * Suggests raising the rate in months that fill up beyond the target
 * occupancy and cutting it in months that sit empty. Half of the gap to the
 * target becomes the change, limited to −20% and +30% and rounded to steps
 * of 5 so the numbers read like prices people set.
 */
export function suggestSeasons(input: {
  baseRate: number;
  targetOccupancy: number;
  occupancyByMonth: number[];
}): MonthSuggestion[] {
  return MONTHS.map((month, index) => {
    const occupancyPercent = input.occupancyByMonth[index] ?? 0;
    const raw = (occupancyPercent - input.targetOccupancy) * 0.5;
    const adjustmentPercent =
      Math.round(Math.min(30, Math.max(-20, raw)) / 5) * 5;
    const label: SeasonLabel =
      adjustmentPercent >= 15
        ? "peak"
        : adjustmentPercent >= 5
          ? "high"
          : adjustmentPercent <= -5
            ? "slow"
            : "steady";
    return {
      month,
      occupancyPercent,
      adjustmentPercent,
      rate: Math.round((input.baseRate * (100 + adjustmentPercent)) / 100),
      label,
    };
  });
}

// --- Investment payback ----------------------------------------------------

export interface InvestmentInputs {
  /** Cash put in: down payment, fit-out, furniture, permits. */
  upfrontCash: number;
  /** Loan or amortization paid every month. */
  loanMonthly: number;
  otherFixedMonthly: number;
  rate: number;
  occupancyPercent: number;
  avgStayNights: number;
  costPerStay: number;
  cleaningFeeCharged: number;
  feePercent: number;
}

export interface InvestmentResult {
  monthlyProfit: number;
  annualProfit: number;
  /** Annual profit as a share of the cash put in; null when nothing was put in. */
  annualReturnPercent: number | null;
  /** Months of profit to earn the cash back; null when profit isn't positive. */
  paybackMonths: number | null;
  breakEvenOccupancy: number | null;
}

export function investmentResult(input: InvestmentInputs): InvestmentResult {
  const inputs: CalculatorInputs = {
    ...DEFAULT_INPUTS,
    fixedMonthly: input.loanMonthly + input.otherFixedMonthly,
    costPerStay: input.costPerStay,
    cleaningFeeCharged: input.cleaningFeeCharged,
    feePercent: input.feePercent,
    avgStayNights: input.avgStayNights,
    occupancyPercent: input.occupancyPercent,
  };
  const monthlyProfit = positionAt(inputs, input.rate).profit;
  const annualProfit = monthlyProfit * 12;
  // Same straight-line maths as the property tool.
  const full = positionAt(inputs, input.rate, 100).profit;
  const slope = (full + inputs.fixedMonthly) / 100;
  return {
    monthlyProfit,
    annualProfit,
    annualReturnPercent:
      input.upfrontCash > 0 ? (annualProfit / input.upfrontCash) * 100 : null,
    paybackMonths:
      monthlyProfit > 0 && input.upfrontCash > 0
        ? input.upfrontCash / monthlyProfit
        : null,
    breakEvenOccupancy: slope > 0 ? inputs.fixedMonthly / slope : null,
  };
}
