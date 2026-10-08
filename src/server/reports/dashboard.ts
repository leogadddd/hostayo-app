import "server-only";

import { and, desc, eq, gte, inArray, isNull, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  expenses,
  bookingPlatforms,
  damageReports,
  guests,
  paymentEntries,
  paymentProofs,
  properties,
  refundEntries,
  reservations,
  unitBlocks,
  units,
} from "@/lib/db/schema";
import {
  buildDashboardSeries,
  type DashboardSeries,
} from "@/lib/dashboard-series";
import { localDateTimeToUtc } from "@/lib/dates";
import { OCCUPANCY_STATUSES } from "@/lib/reporting";

// Same cash timezone as getReport, so dashboard totals reconcile with reports.
const CASH_TIMEZONE = "Asia/Manila";

export interface DashboardPlatformBreakdownRow {
  platformId: string | null;
  name: string;
  logoUrl: string | null;
  color: string | null;
  reservationCount: number;
}

/** Reservation sources for stays that begin in the supplied month window. */
export async function getDashboardPlatformBreakdown(
  organizationId: string,
  range: { from: string; to: string },
): Promise<DashboardPlatformBreakdownRow[]> {
  const reservationCount = sql<number>`count(*)`.mapWith(Number);
  return db
    .select({
      platformId: bookingPlatforms.id,
      name: sql<string>`coalesce(${bookingPlatforms.name}, 'Not recorded')`,
      logoUrl: bookingPlatforms.logoUrl,
      color: bookingPlatforms.color,
      reservationCount,
    })
    .from(reservations)
    .leftJoin(
      bookingPlatforms,
      and(
        eq(reservations.platformId, bookingPlatforms.id),
        eq(reservations.organizationId, bookingPlatforms.organizationId),
      ),
    )
    .where(
      and(
        eq(reservations.organizationId, organizationId),
        inArray(reservations.status, [
          "confirmed",
          "checked_in",
          "checked_out",
        ]),
        gte(reservations.checkInDate, range.from),
        lt(reservations.checkInDate, range.to),
      ),
    )
    .groupBy(
      bookingPlatforms.id,
      bookingPlatforms.name,
      bookingPlatforms.logoUrl,
      bookingPlatforms.color,
    )
    .orderBy(
      sql`${reservationCount} desc`,
      sql`coalesce(${bookingPlatforms.name}, 'Not recorded') asc`,
    );
}

/** Open damage reports across the organization, newest first. */
export async function listOpenDamage(organizationId: string) {
  return db
    .select({
      id: damageReports.id,
      description: damageReports.description,
      estimatedAmountCents: damageReports.estimatedAmountCents,
      createdAt: damageReports.createdAt,
      reservationId: damageReports.reservationId,
      unitId: units.id,
      unitName: units.name,
      propertyId: properties.id,
      propertyName: properties.name,
    })
    .from(damageReports)
    .innerJoin(
      units,
      and(
        eq(damageReports.unitId, units.id),
        eq(damageReports.organizationId, units.organizationId),
      ),
    )
    .innerJoin(properties, eq(units.propertyId, properties.id))
    .where(
      and(
        eq(damageReports.organizationId, organizationId),
        eq(damageReports.status, "open"),
      ),
    )
    .orderBy(desc(damageReports.createdAt));
}

/** Guest-submitted payment references still waiting for someone to review them. */
export async function listPendingProofs(organizationId: string) {
  return db
    .select({
      id: paymentProofs.id,
      reservationId: paymentProofs.reservationId,
      reference: paymentProofs.reference,
      createdAt: paymentProofs.createdAt,
      guestName: guests.name,
    })
    .from(paymentProofs)
    .innerJoin(
      reservations,
      and(
        eq(paymentProofs.reservationId, reservations.id),
        eq(paymentProofs.organizationId, reservations.organizationId),
      ),
    )
    .innerJoin(
      guests,
      and(
        eq(reservations.guestId, guests.id),
        eq(reservations.organizationId, guests.organizationId),
      ),
    )
    .where(
      and(
        eq(paymentProofs.organizationId, organizationId),
        eq(paymentProofs.status, "unverified"),
      ),
    )
    .orderBy(desc(paymentProofs.createdAt));
}

/**
 * Day-by-day cash, spending and occupancy for [from, to), organization-wide,
 * or for one property when `propertyId` is given.
 */
export async function getDashboardSeries(
  organizationId: string,
  range: { from: string; to: string },
  propertyId?: string,
): Promise<DashboardSeries> {
  const { from, to } = range;
  const scopedUnits = propertyId
    ? db
        .select({ id: units.id })
        .from(units)
        .where(
          and(
            eq(units.organizationId, organizationId),
            eq(units.propertyId, propertyId),
          ),
        )
    : null;
  const scopedReservations = scopedUnits
    ? db
        .select({ id: reservations.id })
        .from(reservations)
        .where(
          and(
            eq(reservations.organizationId, organizationId),
            inArray(reservations.unitId, scopedUnits),
          ),
        )
    : null;
  const startUtc = localDateTimeToUtc(`${from}T00:00`, CASH_TIMEZONE)!;
  const endUtc = localDateTimeToUtc(`${to}T00:00`, CASH_TIMEZONE)!;

  const paidOn = (
    column: typeof paymentEntries.receivedAt | typeof refundEntries.refundedAt,
  ) =>
    // Inlined (a constant, never user input) so SELECT and GROUP BY are the same expression.
    sql<string>`to_char(${column} at time zone ${sql.raw(`'${CASH_TIMEZONE}'`)}, 'YYYY-MM-DD')`;
  const paymentDate = paidOn(paymentEntries.receivedAt);
  const refundDate = paidOn(refundEntries.refundedAt);

  const [
    propertyRows,
    unitRows,
    blockRows,
    stayRows,
    paymentRows,
    refundRows,
    expenseRows,
  ] = await Promise.all([
    db
      .select({ id: properties.id, name: properties.name })
      .from(properties)
      .where(
        and(
          eq(properties.organizationId, organizationId),
          propertyId ? eq(properties.id, propertyId) : undefined,
        ),
      )
      .orderBy(properties.name),
    db
      .select({
        id: units.id,
        propertyId: units.propertyId,
        status: units.status,
      })
      .from(units)
      .where(
        and(
          eq(units.organizationId, organizationId),
          propertyId ? eq(units.propertyId, propertyId) : undefined,
        ),
      ),
    db
      .select({
        unitId: unitBlocks.unitId,
        startDate: unitBlocks.startDate,
        endDate: unitBlocks.endDate,
      })
      .from(unitBlocks)
      .where(
        and(
          eq(unitBlocks.organizationId, organizationId),
          lt(unitBlocks.startDate, to),
          gte(unitBlocks.endDate, from),
        ),
      ),
    db
      .select({
        unitId: reservations.unitId,
        checkInDate: reservations.checkInDate,
        checkOutDate: reservations.checkOutDate,
        status: reservations.status,
      })
      .from(reservations)
      .where(
        and(
          eq(reservations.organizationId, organizationId),
          inArray(reservations.status, [...OCCUPANCY_STATUSES]),
          lt(reservations.checkInDate, to),
          gte(reservations.checkOutDate, from),
          scopedUnits ? inArray(reservations.unitId, scopedUnits) : undefined,
        ),
      ),
    db
      .select({
        date: paymentDate,
        amountCents: sql`sum(${paymentEntries.amountCents})`.mapWith(Number),
      })
      .from(paymentEntries)
      .where(
        and(
          eq(paymentEntries.organizationId, organizationId),
          eq(paymentEntries.allocation, "booking"),
          gte(paymentEntries.receivedAt, startUtc),
          lt(paymentEntries.receivedAt, endUtc),
          scopedReservations
            ? inArray(paymentEntries.reservationId, scopedReservations)
            : undefined,
        ),
      )
      .groupBy(paymentDate),
    db
      .select({
        date: refundDate,
        amountCents: sql`sum(${refundEntries.amountCents})`.mapWith(Number),
      })
      .from(refundEntries)
      .where(
        and(
          eq(refundEntries.organizationId, organizationId),
          eq(refundEntries.allocation, "booking"),
          gte(refundEntries.refundedAt, startUtc),
          lt(refundEntries.refundedAt, endUtc),
          scopedReservations
            ? inArray(refundEntries.reservationId, scopedReservations)
            : undefined,
        ),
      )
      .groupBy(refundDate),
    db
      .select({
        date: expenses.paidDate,
        category: expenses.category,
        classification: expenses.classification,
        amountCents: sql`sum(${expenses.amountCents})`.mapWith(Number),
      })
      .from(expenses)
      .where(
        and(
          eq(expenses.organizationId, organizationId),
          gte(expenses.paidDate, from),
          lt(expenses.paidDate, to),
          isNull(expenses.voidedAt),
          propertyId ? eq(expenses.propertyId, propertyId) : undefined,
        ),
      )
      .groupBy(expenses.paidDate, expenses.category, expenses.classification),
  ]);

  return buildDashboardSeries({
    from,
    to,
    properties: propertyRows,
    units: unitRows,
    blocks: blockRows,
    stays: stayRows,
    payments: paymentRows,
    refunds: refundRows,
    expenses: expenseRows,
  });
}
