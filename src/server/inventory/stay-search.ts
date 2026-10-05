import "server-only";

import type { Unit } from "@/lib/db/schema";
import { isLocalDate, localDateTimeToUtc, nightsBetween } from "@/lib/dates";
import {
  checkIntervalAvailability,
  findTurnoverArrivalConflict,
  getLateCheckouts,
  getOccupancySegments,
  lateCheckoutConflict,
  type LateCheckout,
  type OccupancySegment,
} from "./availability";

export interface StaySearch {
  checkIn: string;
  checkOut: string;
  guestCount: number;
  nights: number;
}

export interface StaySearchParams {
  checkIn?: string;
  checkOut?: string;
  guests?: string;
}

const MAX_NIGHTS = 365;

/**
 * Reads a stay search from URL params. Returns neither field when no search
 * was made, so the page can show its idle state instead of an error.
 */
export function parseStaySearch(params: StaySearchParams): {
  search?: StaySearch;
  error?: string;
} {
  if (!params.checkIn && !params.checkOut && !params.guests) return {};
  const checkIn = params.checkIn ?? "";
  const checkOut = params.checkOut ?? "";
  const guestCount = Number(params.guests ?? "");
  if (
    !isLocalDate(checkIn) ||
    !isLocalDate(checkOut) ||
    !Number.isInteger(guestCount) ||
    guestCount < 1 ||
    guestCount > 50
  ) {
    return { error: "Enter a guest count and both dates." };
  }
  if (checkOut <= checkIn)
    return { error: "Check-out must be after check-in." };
  const nights = nightsBetween(checkIn, checkOut);
  if (nights > MAX_NIGHTS)
    return { error: `Search up to ${MAX_NIGHTS} nights at a time.` };
  return { search: { checkIn, checkOut, guestCount, nights } };
}

/** The URL params that carry a search between the results, showcase, and booking pages. */
export function staySearchQuery(search: StaySearch) {
  return new URLSearchParams({
    checkIn: search.checkIn,
    checkOut: search.checkOut,
    guests: String(search.guestCount),
  });
}

/** Why a unit can't take the stay, or null when it is free. */
function stayConflict(
  segments: OccupancySegment[],
  unit: Pick<Unit, "checkInTime">,
  timezone: string | undefined,
  search: Pick<StaySearch, "checkIn" | "checkOut">,
  late?: LateCheckout,
  excludeReservationId?: string,
): string | null {
  const check = checkIntervalAvailability(
    segments,
    search.checkIn,
    search.checkOut,
  );
  if (!check.available) return check.conflict.reason;
  const arrivalAt = timezone
    ? localDateTimeToUtc(`${search.checkIn}T${unit.checkInTime}`, timezone)
    : null;
  if (arrivalAt && findTurnoverArrivalConflict(segments, arrivalAt))
    return "Turnover still running at check-in time";
  return lateCheckoutConflict(late, arrivalAt, excludeReservationId)
    ? "Previous guest has a late check-out that runs into check-in time"
    : null;
}

/**
 * Which of the given units are free for the whole stay: no overlapping stay,
 * hold, block, or turnover, and no turnover still running at arrival time.
 * Capacity and unit status are the caller's to filter.
 */
export async function findFreeUnitIds(
  organizationId: string,
  units: Pick<Unit, "id" | "propertyId" | "checkInTime">[],
  timezoneByProperty: Map<string, string>,
  search: Pick<StaySearch, "checkIn" | "checkOut">,
): Promise<Set<string>> {
  if (units.length === 0) return new Set();
  const unitIds = units.map((unit) => unit.id);
  const [segmentsByUnit, late] = await Promise.all([
    getOccupancySegments(
      organizationId,
      unitIds,
      search.checkIn,
      search.checkOut,
    ),
    getLateCheckouts(organizationId, unitIds, search.checkIn),
  ]);
  return new Set(
    units
      .filter(
        (unit) =>
          stayConflict(
            segmentsByUnit.get(unit.id) ?? [],
            unit,
            timezoneByProperty.get(unit.propertyId),
            search,
            late.get(unit.id),
          ) === null,
      )
      .map((unit) => unit.id),
  );
}

/**
 * One unit's availability for a stay, with the reason when it isn't free.
 * `excludeReservationId` ignores that reservation (and its turnover), for
 * checking new dates while editing it.
 */
export async function explainUnitStay(
  organizationId: string,
  unit: Pick<Unit, "id" | "checkInTime">,
  timezone: string,
  search: Pick<StaySearch, "checkIn" | "checkOut">,
  excludeReservationId?: string,
): Promise<{ available: true } | { available: false; reason: string }> {
  const [segmentsByUnit, late] = await Promise.all([
    getOccupancySegments(
      organizationId,
      [unit.id],
      search.checkIn,
      search.checkOut,
    ),
    getLateCheckouts(organizationId, [unit.id], search.checkIn),
  ]);
  const segments = (segmentsByUnit.get(unit.id) ?? []).filter(
    (segment) =>
      !excludeReservationId ||
      !(segment.kind === "reservation"
        ? segment.id === excludeReservationId
        : segment.kind === "turnover" &&
          segment.reservationId === excludeReservationId),
  );
  const reason = stayConflict(
    segments,
    unit,
    timezone,
    search,
    late.get(unit.id),
    excludeReservationId,
  );
  return reason ? { available: false, reason } : { available: true };
}
