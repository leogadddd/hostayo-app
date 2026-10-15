/**
 * Back-of-the-envelope maths for picking a unit's nightly rate. A standalone
 * estimate: nothing here reads or writes real data. Amounts are pesos as
 * typed (not centavos), since the results are rounded planning figures.
 */

export interface CalculatorInputs {
  /** Costs that come due whether or not the unit is booked, per month. */
  fixedMonthly: number;
  /** Cleaning, laundry and supplies the owner pays after each stay. */
  costPerStay: number;
  /** Cleaning fee charged to the guest per stay. */
  cleaningFeeCharged: number;
  /** Booking platform and payment fees, as a percent of what guests pay. */
  feePercent: number;
  avgStayNights: number;
  occupancyPercent: number;
  /** Profit the owner wants per month after every cost. */
  targetProfit: number;
  /** Extra percent charged on Friday and Saturday nights. */
  weekendUpliftPercent: number;
  /** The rate in use now, to compare against. Zero means none. */
  currentRate: number;
  daysInMonth: number;
}

export const DEFAULT_INPUTS: CalculatorInputs = {
  fixedMonthly: 0,
  costPerStay: 0,
  cleaningFeeCharged: 0,
  feePercent: 3,
  avgStayNights: 2,
  occupancyPercent: 60,
  targetProfit: 0,
  weekendUpliftPercent: 20,
  currentRate: 0,
  daysInMonth: 30,
};

export interface Position {
  bookedNights: number;
  stays: number;
  revenue: number;
  fees: number;
  costs: number;
  profit: number;
  /** Profit as a share of revenue; null when there is no revenue. */
  marginPercent: number | null;
}

function nightsAndStays(inputs: CalculatorInputs, occupancyPercent: number) {
  const bookedNights = (inputs.daysInMonth * occupancyPercent) / 100;
  const stays =
    inputs.avgStayNights > 0 ? bookedNights / inputs.avgStayNights : 0;
  return { bookedNights, stays };
}

/** The month at a given nightly rate and occupancy. */
export function positionAt(
  inputs: CalculatorInputs,
  rate: number,
  occupancyPercent = inputs.occupancyPercent,
): Position {
  const { bookedNights, stays } = nightsAndStays(inputs, occupancyPercent);
  const revenue = rate * bookedNights + inputs.cleaningFeeCharged * stays;
  const fees = (revenue * inputs.feePercent) / 100;
  const costs = inputs.fixedMonthly + inputs.costPerStay * stays;
  const profit = revenue - fees - costs;
  return {
    bookedNights,
    stays,
    revenue,
    fees,
    costs,
    profit,
    marginPercent: revenue > 0 ? (profit / revenue) * 100 : null,
  };
}

/**
 * The nightly rate that earns `profit` at an occupancy, or null when no
 * nights would be booked.
 */
export function rateFor(
  inputs: CalculatorInputs,
  profit: number,
  occupancyPercent = inputs.occupancyPercent,
): number | null {
  const { bookedNights, stays } = nightsAndStays(inputs, occupancyPercent);
  const keep = 1 - inputs.feePercent / 100;
  if (bookedNights <= 0 || keep <= 0) return null;
  const needed =
    profit +
    inputs.fixedMonthly +
    inputs.costPerStay * stays -
    inputs.cleaningFeeCharged * stays * keep;
  return Math.max(0, needed / (bookedNights * keep));
}

/**
 * The occupancy that earns `profit` at a nightly rate, as a percent of the
 * month; null when the rate can't cover costs at any occupancy, and above 100
 * when the month isn't long enough.
 */
export function occupancyFor(
  inputs: CalculatorInputs,
  rate: number,
  profit = 0,
): number | null {
  const keep = 1 - inputs.feePercent / 100;
  const perNight =
    rate * keep +
    (inputs.avgStayNights > 0
      ? (inputs.cleaningFeeCharged * keep - inputs.costPerStay) /
        inputs.avgStayNights
      : 0);
  if (perNight <= 0 || inputs.daysInMonth <= 0) return null;
  const nights = (profit + inputs.fixedMonthly) / perNight;
  return (nights / inputs.daysInMonth) * 100;
}

/**
 * Splits an average nightly rate into weekday and weekend rates. Friday and
 * Saturday nights are two of every seven, so the average stays what was asked.
 */
export function weekdayWeekendRates(
  average: number,
  upliftPercent: number,
): { weekday: number; weekend: number } {
  const weekday = average / (1 + (2 * upliftPercent) / 100 / 7);
  return { weekday, weekend: weekday * (1 + upliftPercent / 100) };
}

/** Round up to the next ₱50, since nobody lists ₱2,347. */
export function tidyRate(rate: number): number {
  return Math.ceil(rate / 50) * 50;
}
