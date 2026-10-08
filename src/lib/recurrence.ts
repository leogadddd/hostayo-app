import { isLocalDate } from "@/lib/dates";

export const CADENCES = ["weekly", "monthly", "yearly"] as const;
export type Cadence = (typeof CADENCES)[number];

export const CADENCE_LABELS: Record<Cadence, string> = {
  weekly: "Every week",
  monthly: "Every month",
  yearly: "Every year",
};

/** Hard stop for the search below; a template never needs this many periods. */
const MAX_PERIODS = 5000;

function parts(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return { year: year!, month: month!, day: day! };
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function iso(year: number, month: number, day: number): string {
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);
}

/**
 * The nth due date counted from the first one (n = 0 is the anchor itself).
 * Months and years keep the anchor's day, clamped to short months: a bill
 * first due on the 31st falls on Feb 28/29, then goes back to the 31st.
 */
export function occurrence(anchor: string, cadence: Cadence, n: number) {
  if (!isLocalDate(anchor)) throw new Error("Expected a yyyy-mm-dd date.");
  const { year, month, day } = parts(anchor);
  if (cadence === "weekly") return iso(year, month, day + 7 * n);
  const totalMonths =
    cadence === "monthly" ? month - 1 + n : month - 1 + 12 * n;
  const y = year + Math.floor(totalMonths / 12);
  const m = (((totalMonths % 12) + 12) % 12) + 1;
  return iso(y, m, Math.min(day, daysInMonth(y, m)));
}

/** The first due date strictly after `date`. */
export function nextDueAfter(
  anchor: string,
  cadence: Cadence,
  date: string,
): string {
  for (let n = 0; n < MAX_PERIODS; n += 1) {
    const due = occurrence(anchor, cadence, n);
    if (due > date) return due;
  }
  throw new Error("Could not find the next due date.");
}

/** What the template costs per month, for the run-rate total. */
export function monthlyEquivalentCents(
  amountCents: number,
  cadence: Cadence,
): number {
  if (cadence === "monthly") return amountCents;
  if (cadence === "yearly") return Math.round(amountCents / 12);
  return Math.round((amountCents * 52) / 12);
}
