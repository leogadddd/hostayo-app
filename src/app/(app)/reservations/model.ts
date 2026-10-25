import { can } from "@/lib/permissions";
import { RESERVATION_STATUSES, type ReservationStatus } from "@/lib/db/schema";
import { isLocalDate, nightsBetween } from "@/lib/dates";
import { listReservations } from "@/server/reservations/service";
import { expireStaleHolds } from "@/server/reservations/holds";
import { listOrgUnits } from "@/server/inventory/service";
import { listPlatforms } from "@/server/reservations/platforms";
import { db } from "@/lib/db";
import type { MembershipContext } from "@/lib/auth/session";

export const DATE_LABEL = new Intl.DateTimeFormat("en-PH", {
  weekday: "short",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});
const DATE_WITH_YEAR = new Intl.DateTimeFormat("en-PH", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});
// Bookings are stamped in UTC; show when they were made in the operators' local time.
const YEAR = new Intl.DateTimeFormat("en-PH", {
  year: "numeric",
  timeZone: "Asia/Manila",
});
export const CREATED_AT = new Intl.DateTimeFormat("en-PH", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Manila",
});
export const HOLD_EXPIRY = new Intl.DateTimeFormat("en-PH", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Manila",
});

/** "Tue, Oct 20" this year; "Oct 20, 2027" otherwise, so the column stays narrow. */
export function dayLabel(date: string, thisYear: string) {
  const value = new Date(`${date}T00:00:00Z`);
  return date.startsWith(thisYear)
    ? DATE_LABEL.format(value)
    : DATE_WITH_YEAR.format(value);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The ids a repeated query parameter carries, without blanks, repeats or anything that isn't an id. */
export function parseIds(value: string | string[] | undefined): string[] {
  const list = Array.isArray(value) ? value : [value];
  return [
    ...new Set(
      list.filter((item): item is string => Boolean(item) && UUID.test(item!)),
    ),
  ];
}

/** Holds and confirmed stays can still be edited or cancelled. */
export function isActiveReservation(status: ReservationStatus) {
  return status === "hold" || status === "confirmed";
}

export type ReservationsSearchParams = {
  q?: string;
  status?: string;
  /** Repeat the parameter to select several. */
  unit?: string | string[];
  platform?: string | string[];
  start?: string;
  end?: string;
  sort?: string;
};

const MONTH_LABEL = new Intl.DateTimeFormat("en-PH", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const BOOKED_DAY = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "Asia/Manila",
});

/** One reservation, worked out for a phone card. */
export function toReservationRow(
  reservation: Awaited<ReturnType<typeof listReservations>>[number],
  context: {
    thisYear: string;
    sort: "checkin" | "booked";
    showTotals: boolean;
    canEdit: boolean;
    canCancel: boolean;
  },
) {
  const active = isActiveReservation(reservation.status);
  const href = `/reservations/${reservation.id}`;
  const money = reservation as {
    bookingTotalCents?: number;
    bookingPaidCents?: number;
    bookingRefundedCents?: number;
  };
  const amounts = {
    total: money.bookingTotalCents ?? 0,
    paid: money.bookingPaidCents ?? 0,
    refunded: money.bookingRefundedCents ?? 0,
  };
  // Grouped by the month of whatever the list is sorted by.
  const groupDate =
    context.sort === "booked" && reservation.createdAt
      ? BOOKED_DAY.format(reservation.createdAt)
      : reservation.checkInDate;
  return {
    id: reservation.id,
    href,
    ref: `#${reservation.id.slice(0, 8).toUpperCase()}`,
    guestName: reservation.guestName,
    status: reservation.status,
    holdExpiresLabel:
      reservation.status === "hold" && reservation.expiresAt
        ? HOLD_EXPIRY.format(reservation.expiresAt)
        : null,
    propertyName: reservation.propertyName ?? null,
    unitName: reservation.unitName,
    checkInDate: reservation.checkInDate,
    checkOutDate: reservation.checkOutDate,
    checkInLabel: dayLabel(reservation.checkInDate, context.thisYear),
    checkOutLabel: dayLabel(reservation.checkOutDate, context.thisYear),
    nights: nightsBetween(reservation.checkInDate, reservation.checkOutDate),
    guestCount: reservation.guestCount,
    platform: reservation.platformName
      ? {
          name: reservation.platformName,
          logoUrl: reservation.platformLogoUrl,
          color: reservation.platformColor,
        }
      : null,
    platformReference: reservation.platformReference ?? null,
    totalCents: context.showTotals ? amounts.total : null,
    // Still owed on the booking; negative when overpaid.
    balanceCents: context.showTotals
      ? amounts.total - amounts.paid + amounts.refunded
      : null,
    createdAt: reservation.createdAt ?? null,
    editHref: context.canEdit && active ? `${href}/edit` : null,
    canCancel: context.canCancel && active,
    groupKey: groupDate.slice(0, 7),
    groupLabel: MONTH_LABEL.format(
      new Date(`${groupDate.slice(0, 7)}-01T00:00:00Z`),
    ),
  };
}

export type ReservationRow = ReturnType<typeof toReservationRow>;

/** Everything the reservations list shows, loaded and worked out once for both layouts. */
export async function getReservationsModel(
  membership: MembershipContext,
  params: ReservationsSearchParams,
) {
  await expireStaleHolds(db, membership.organizationId);
  const showTotals = can(membership, "payments.view");
  const canEdit =
    can(membership, "reservations.update") &&
    can(membership, "payments.create");
  const canCancel = can(membership, "reservations.delete");

  const status = RESERVATION_STATUSES.includes(
    params.status as ReservationStatus,
  )
    ? (params.status as ReservationStatus)
    : undefined;
  const sort: "checkin" | "booked" =
    params.sort === "booked" ? "booked" : "checkin";
  const unitIds = parseIds(params.unit);
  const platformIds = parseIds(params.platform);
  const startDate = isLocalDate(params.start ?? "") ? params.start : undefined;
  const endDate = isLocalDate(params.end ?? "") ? params.end : undefined;

  // Loaded without the status filter so the status pills can show counts.
  const [allReservations, units, platforms] = await Promise.all([
    listReservations(membership.organizationId, {
      query: params.q,
      unitIds,
      platformIds,
      startDate,
      endDate,
      sort,
      includeTotals: showTotals,
    }),
    listOrgUnits(membership.organizationId),
    listPlatforms(membership.organizationId, { includeInactive: true }),
  ]);
  const reservations = status
    ? allReservations.filter((reservation) => reservation.status === status)
    : allReservations;
  const counts = new Map<ReservationStatus, number>();
  for (const reservation of allReservations)
    counts.set(reservation.status, (counts.get(reservation.status) ?? 0) + 1);
  const showProperty = new Set(units.map((unit) => unit.propertyId)).size > 1;
  const thisYear = YEAR.format(new Date());

  const hrefWith = (patch: Record<string, string | string[] | undefined>) => {
    const query = new URLSearchParams();
    const next: Record<string, string | string[] | undefined> = {
      q: params.q,
      status,
      unit: unitIds,
      platform: platformIds,
      start: startDate,
      end: endDate,
      sort: sort === "booked" ? "booked" : undefined,
      ...patch,
    };
    for (const [key, value] of Object.entries(next))
      for (const item of Array.isArray(value) ? value : [value])
        if (item) query.append(key, item);
    const text = query.toString();
    return text ? `/reservations?${text}` : "/reservations";
  };
  const filtered = Boolean(
    params.q ||
    status ||
    unitIds.length ||
    platformIds.length ||
    startDate ||
    endDate,
  );

  const rowContext = { thisYear, sort, showTotals, canEdit, canCancel };
  const rows = reservations.map((reservation) =>
    toReservationRow(reservation, rowContext),
  );

  return {
    params,
    status,
    sort,
    unitIds,
    platformIds,
    startDate,
    endDate,
    reservations,
    rows,
    allCount: allReservations.length,
    counts,
    units,
    platforms,
    showProperty,
    showTotals,
    canEdit,
    canCancel,
    canCreate: can(membership, "reservations.create"),
    thisYear,
    hrefWith,
    filtered,
  };
}

export type ReservationsModel = Awaited<
  ReturnType<typeof getReservationsModel>
>;
