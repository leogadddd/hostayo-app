/**
 * Stay extensions: late check-out by the hour, on the check-out day only
 * (extra nights go through editing the reservation). Pure so the reservation
 * page, the extend form and the service agree on the numbers.
 */

const HOUR_MS = 3_600_000;

/** Hours from arrival to departure: 2 nights, 15:00 → 11:00 is 44 hours. */
export function stayHours(nights: number, checkInTime: string, checkOutTime: string): number {
  const minutes = (time: string) => {
    const [hours, mins] = time.split(":").map(Number);
    return (hours ?? 0) * 60 + (mins ?? 0);
  };
  return Math.max(1, nights * 24 + (minutes(checkOutTime) - minutes(checkInTime)) / 60);
}

/**
 * The default price of one extra hour: the stay's accommodation total spread
 * over its length, rounded to whole pesos. Cleaning, fees and deposits don't
 * count towards it.
 */
export function defaultHourlyRateCents(accommodationCents: number, hours: number): number {
  if (accommodationCents <= 0 || hours <= 0) return 0;
  return Math.round(accommodationCents / hours / 100) * 100;
}

/** The unit's fixed hourly rate when set, otherwise the stay-based default. */
export function extensionHourlyRateCents(unitRateCents: number | null, accommodationCents: number, hours: number): number {
  return unitRateCents ?? defaultHourlyRateCents(accommodationCents, hours);
}

export type ExtensionLimit = "unit_limit" | "next_arrival" | "end_of_day";

export interface ExtensionWindow {
  /** Whole hours that can still be added now; 0 means none. */
  availableHours: number;
  /** What caps `availableHours`. */
  limitedBy: ExtensionLimit;
  /** Departure with the extensions already added. */
  departureAt: Date;
}

/**
 * How many more hours a stay can run past its departure. The extra time plus
 * the unit's turnover must finish before the next guest arrives, the stay
 * can't run past midnight on the check-out day, and the unit caps the total.
 */
export function extensionWindow(input: {
  /** The unit's normal check-out on the check-out day. */
  checkoutAt: Date;
  /** Hours already added to this stay. */
  extendedHours: number;
  maxHours: number;
  turnoverMinutes: number;
  /** When the next guest (or a block) needs the unit that day, if at all. */
  nextArrivalAt: Date | null;
  /** Midnight at the end of the check-out day. */
  dayEndsAt: Date;
}): ExtensionWindow {
  const departureAt = new Date(input.checkoutAt.getTime() + input.extendedHours * HOUR_MS);
  const byUnit = Math.max(0, input.maxHours - input.extendedHours);
  const byDay = Math.floor((input.dayEndsAt.getTime() - departureAt.getTime()) / HOUR_MS);
  const byArrival = input.nextArrivalAt
    ? Math.floor((input.nextArrivalAt.getTime() - input.turnoverMinutes * 60_000 - departureAt.getTime()) / HOUR_MS)
    : Number.POSITIVE_INFINITY;
  const limits: [ExtensionLimit, number][] = [["unit_limit", byUnit], ["next_arrival", byArrival], ["end_of_day", byDay]];
  const [limitedBy, hours] = limits.reduce((lowest, candidate) => (candidate[1] < lowest[1] ? candidate : lowest));
  return { availableHours: Math.max(0, hours), limitedBy, departureAt };
}

/** Whether a late check-out still running (with turnover) blocks an arrival. */
export function lateCheckoutBlocksArrival(departureAt: Date, turnoverMinutes: number, arrivalAt: Date): boolean {
  return arrivalAt.getTime() < departureAt.getTime() + turnoverMinutes * 60_000;
}

/** A unit's "HH:MM" check-out moved later by extension hours ("11:00" + 2 → "13:00"). */
export function extendedCheckoutTime(checkOutTime: string, hours: number): string {
  if (!hours) return checkOutTime;
  const [h, m] = checkOutTime.split(":").map(Number);
  // Extensions never run past midnight, so this stays on the same day.
  const minutes = Math.min(24 * 60 - 1, (h ?? 0) * 60 + (m ?? 0) + hours * 60);
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}
