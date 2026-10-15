import type { ReservationStatus } from "@/lib/db/schema/reservations";

export type SearchDateKind = "arriving" | "departing" | "staying";

export interface SearchDateFilter {
  kind: SearchDateKind;
  /** First day, inclusive, as `yyyy-mm-dd`. */
  from: string;
  /** Last day, inclusive. */
  to: string;
}

export interface ParsedSearch {
  /** What's left once filters are taken out: names, codes, places. */
  text: string;
  statuses: ReservationStatus[];
  date: SearchDateFilter | null;
}

const MONTHS = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
];

const STATUS_WORDS: Record<string, ReservationStatus> = {
  hold: "hold",
  holds: "hold",
  pending: "hold",
  confirmed: "confirmed",
  "in-house": "checked_in",
  inhouse: "checked_in",
  staying: "checked_in",
  cancelled: "cancelled",
  canceled: "cancelled",
  expired: "expired",
};

const ARRIVING_WORDS = new Set([
  "checkin",
  "check-in",
  "arriving",
  "arrival",
  "arrivals",
]);
const DEPARTING_WORDS = new Set([
  "checkout",
  "check-out",
  "departing",
  "departure",
  "departures",
]);

function addDays(date: string, days: number) {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

/** The real calendar date for a month and day, or null ("feb 30"). */
function calendarDate(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day)
    return null;
  return `${year}-${pad(month)}-${pad(day)}`;
}

function monthIndex(word: string) {
  // "oct", "october", "sept"; a bare "may" is a name until a day sits beside it.
  if (word.length < 3) return -1;
  return MONTHS.findIndex((month) => word.startsWith(month));
}

function weekOf(today: string, offsetWeeks: number) {
  const weekday = new Date(`${today}T00:00:00Z`).getUTCDay();
  const monday = addDays(today, -((weekday + 6) % 7) + offsetWeeks * 7);
  return { from: monday, to: addDays(monday, 6) };
}

/**
 * Pull the dates and statuses out of a search ("checkin tomorrow", "maria oct
 * 20", "cancelled") so they become filters instead of text to match. A date on
 * its own means "staying that night"; "checkin"/"checkout" make it arrivals or
 * departures, and with no date they mean today. Pure string work, so it adds
 * nothing to the request. `today` is the organization's local date.
 */
export function parseSearchQuery(query: string, today: string): ParsedSearch {
  const tokens = query.trim().split(/\s+/).filter(Boolean);
  const statuses: ReservationStatus[] = [];
  const rest: string[] = [];
  let kind: Exclude<SearchDateKind, "staying"> | null = null;
  let range: { from: string; to: string } | null = null;
  const year = Number(today.slice(0, 4));

  for (let i = 0; i < tokens.length; i += 1) {
    const raw = tokens[i]!;
    const word = raw.toLowerCase();
    const next = tokens[i + 1]?.toLowerCase();

    if (ARRIVING_WORDS.has(word)) kind ??= "arriving";
    else if (DEPARTING_WORDS.has(word)) kind ??= "departing";
    else if (STATUS_WORDS[word]) {
      const status = STATUS_WORDS[word]!;
      if (!statuses.includes(status)) statuses.push(status);
    } else if (!range) {
      let found: { from: string; to: string } | null = null;
      let used = 1;
      if (word === "today") found = { from: today, to: today };
      else if (word === "tomorrow") {
        const day = addDays(today, 1);
        found = { from: day, to: day };
      } else if (word === "yesterday") {
        const day = addDays(today, -1);
        found = { from: day, to: day };
      } else if ((word === "this" || word === "next") && next === "week") {
        found = weekOf(today, word === "next" ? 1 : 0);
        used = 2;
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(word)) {
        const [y, m, d] = word.split("-").map(Number);
        const day = calendarDate(y!, m!, d!);
        if (day) found = { from: day, to: day };
      } else {
        // "oct 20", "october 20", "20 oct"
        const monthFirst = monthIndex(word);
        if (monthFirst >= 0 && next && /^\d{1,2}$/.test(next)) {
          const day = calendarDate(year, monthFirst + 1, Number(next));
          if (day) found = { from: day, to: day };
          used = 2;
        } else if (/^\d{1,2}$/.test(word) && next && monthIndex(next) >= 0) {
          const day = calendarDate(year, monthIndex(next) + 1, Number(word));
          if (day) found = { from: day, to: day };
          used = 2;
        }
      }
      if (found) {
        range = found;
        i += used - 1;
      } else rest.push(raw);
    } else rest.push(raw);
  }

  let date: SearchDateFilter | null = null;
  if (range) date = { kind: kind ?? "staying", ...range };
  else if (kind) date = { kind, from: today, to: today };

  return { text: rest.join(" "), statuses, date };
}
