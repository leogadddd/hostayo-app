/**
 * What an owner tells us about their business during onboarding. Stored as
 * bands rather than exact numbers: it sizes the checklist and helps us
 * understand who we're building for, nothing more.
 */
export interface OnboardingProfile {
  unitCount?: UnitCountBand;
  monthlyBookings?: MonthlyBookingsBand;
  sources?: BookingSource[];
  teamSize?: TeamSize;
  currentTool?: CurrentTool;
}

export interface Option<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

export const UNIT_COUNT_OPTIONS = [
  { value: "1", label: "Just 1" },
  { value: "2-5", label: "2 to 5" },
  { value: "6-15", label: "6 to 15" },
  { value: "16+", label: "16 or more" },
] as const satisfies readonly Option<string>[];
export type UnitCountBand = (typeof UNIT_COUNT_OPTIONS)[number]["value"];

export const MONTHLY_BOOKINGS_OPTIONS = [
  { value: "0-5", label: "Fewer than 5" },
  { value: "5-20", label: "5 to 20" },
  { value: "20-50", label: "20 to 50" },
  { value: "50+", label: "More than 50" },
] as const satisfies readonly Option<string>[];
export type MonthlyBookingsBand =
  (typeof MONTHLY_BOOKINGS_OPTIONS)[number]["value"];

export const BOOKING_SOURCE_OPTIONS = [
  { value: "airbnb", label: "Airbnb" },
  { value: "booking_com", label: "Booking.com" },
  { value: "agoda", label: "Agoda" },
  { value: "facebook", label: "Facebook / Messenger" },
  { value: "viber_whatsapp", label: "Viber / WhatsApp" },
  { value: "referrals", label: "Referrals & repeat guests" },
  { value: "own_website", label: "My own website" },
] as const satisfies readonly Option<string>[];
export type BookingSource = (typeof BOOKING_SOURCE_OPTIONS)[number]["value"];

export const TEAM_SIZE_OPTIONS = [
  { value: "solo", label: "Just me" },
  { value: "2-5", label: "2 to 5 people" },
  { value: "6+", label: "6 or more" },
] as const satisfies readonly Option<string>[];
export type TeamSize = (typeof TEAM_SIZE_OPTIONS)[number]["value"];

export const CURRENT_TOOL_OPTIONS = [
  { value: "spreadsheet", label: "Spreadsheet" },
  { value: "notebook", label: "Notebook or chat messages" },
  { value: "other_app", label: "Another app" },
  { value: "nothing", label: "Nothing yet" },
] as const satisfies readonly Option<string>[];
export type CurrentTool = (typeof CURRENT_TOOL_OPTIONS)[number]["value"];

function pick<T extends string>(
  options: readonly Option<T>[],
  value: unknown,
): T | undefined {
  return options.find((option) => option.value === value)?.value;
}

/** Keeps only known values, so a tampered form can't store arbitrary text. */
export function parseOperationAnswers(input: {
  unitCount: unknown;
  monthlyBookings: unknown;
}): Pick<OnboardingProfile, "unitCount" | "monthlyBookings"> {
  return {
    unitCount: pick(UNIT_COUNT_OPTIONS, input.unitCount),
    monthlyBookings: pick(MONTHLY_BOOKINGS_OPTIONS, input.monthlyBookings),
  };
}

export function parseWorkflowAnswers(input: {
  sources: unknown[];
  teamSize: unknown;
  currentTool: unknown;
}): Pick<OnboardingProfile, "sources" | "teamSize" | "currentTool"> {
  const sources = new Set<BookingSource>();
  for (const value of input.sources) {
    const source = pick(BOOKING_SOURCE_OPTIONS, value);
    if (source) sources.add(source);
  }
  return {
    sources: [...sources],
    teamSize: pick(TEAM_SIZE_OPTIONS, input.teamSize),
    currentTool: pick(CURRENT_TOOL_OPTIONS, input.currentTool),
  };
}
