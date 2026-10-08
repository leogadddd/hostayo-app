import "server-only";

import { and, asc, eq, gte, inArray, isNull, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  bookingPlatforms,
  expenses,
  guests,
  paymentEntries,
  properties,
  refundEntries,
  reservationCharges,
  reservations,
  units,
} from "@/lib/db/schema";
import { centavosToDecimal, toCsv } from "@/lib/csv";
import {
  addDaysLocal,
  isLocalDate,
  localDateTimeToUtc,
  nightsBetween,
  utcToLocalDateTimeParts,
} from "@/lib/dates";
import { ReportError } from "./service";

export const EXPORT_TYPES = ["bookings", "payments", "expenses"] as const;
export type ExportType = (typeof EXPORT_TYPES)[number];

const TIMEZONE = "Asia/Manila";
/** Same ceiling as the on-screen report, so exports can't be used to dump years at once. */
const MAX_EXPORT_DAYS = 366;

export interface ExportFilters {
  from: string;
  to: string;
  propertyId?: string;
}

export interface CsvExport {
  filename: string;
  csv: string;
}

function validate(filters: ExportFilters) {
  const { from, to } = filters;
  if (!isLocalDate(from) || !isLocalDate(to) || to <= from) {
    throw new ReportError("Choose a valid date range.");
  }
  if (nightsBetween(from, to) > MAX_EXPORT_DAYS) {
    throw new ReportError("Keep the export period under a year.");
  }
  const startUtc = localDateTimeToUtc(`${from}T00:00`, TIMEZONE);
  const endUtc = localDateTimeToUtc(`${to}T00:00`, TIMEZONE);
  if (!startUtc || !endUtc) throw new ReportError("Choose a valid date range.");
  return { startUtc, endUtc };
}

function filename(type: ExportType, { from, to }: ExportFilters) {
  // `to` is exclusive on screen; the file name shows the last day included.
  return `hostayo-${type}-${from}_to_${addDaysLocal(to, -1)}.csv`;
}

function manilaStamp(value: Date | null): string {
  if (!value) return "";
  const { date, time } = utcToLocalDateTimeParts(value, TIMEZONE);
  return `${date} ${time}`;
}

/** One row per stay checking in during the period, every status. */
export async function exportBookings(
  organizationId: string,
  filters: ExportFilters,
): Promise<CsvExport> {
  validate(filters);
  const { from, to, propertyId } = filters;
  const rows = await db
    .select({
      id: reservations.id,
      status: reservations.status,
      checkInDate: reservations.checkInDate,
      checkOutDate: reservations.checkOutDate,
      guestCount: reservations.guestCount,
      platformReference: reservations.platformReference,
      source: reservations.source,
      createdAt: reservations.createdAt,
      cancelledAt: reservations.cancelledAt,
      cancelReason: reservations.cancelReason,
      property: properties.name,
      unit: units.name,
      guest: guests.name,
      guestEmail: guests.email,
      guestPhone: guests.phone,
      platform: bookingPlatforms.name,
    })
    .from(reservations)
    .innerJoin(
      units,
      and(
        eq(reservations.unitId, units.id),
        eq(reservations.organizationId, units.organizationId),
      ),
    )
    .innerJoin(properties, eq(units.propertyId, properties.id))
    .innerJoin(guests, eq(reservations.guestId, guests.id))
    .leftJoin(
      bookingPlatforms,
      eq(reservations.platformId, bookingPlatforms.id),
    )
    .where(
      and(
        eq(reservations.organizationId, organizationId),
        gte(reservations.checkInDate, from),
        lt(reservations.checkInDate, to),
        propertyId ? eq(units.propertyId, propertyId) : undefined,
      ),
    )
    .orderBy(asc(reservations.checkInDate), asc(reservations.createdAt));

  const ids = rows.map((row) => row.id);
  const [charges, payments, refunds] =
    ids.length === 0
      ? [[], [], []]
      : await Promise.all([
          db
            .select({
              reservationId: reservationCharges.reservationId,
              type: reservationCharges.type,
              quantity: reservationCharges.quantity,
              unitAmountCents: reservationCharges.unitAmountCents,
              isRefundableDeposit: reservationCharges.isRefundableDeposit,
            })
            .from(reservationCharges)
            .where(
              and(
                eq(reservationCharges.organizationId, organizationId),
                inArray(reservationCharges.reservationId, ids),
              ),
            ),
          db
            .select({
              reservationId: paymentEntries.reservationId,
              allocation: paymentEntries.allocation,
              amountCents: paymentEntries.amountCents,
            })
            .from(paymentEntries)
            .where(
              and(
                eq(paymentEntries.organizationId, organizationId),
                inArray(paymentEntries.reservationId, ids),
              ),
            ),
          db
            .select({
              reservationId: refundEntries.reservationId,
              allocation: refundEntries.allocation,
              amountCents: refundEntries.amountCents,
            })
            .from(refundEntries)
            .where(
              and(
                eq(refundEntries.organizationId, organizationId),
                inArray(refundEntries.reservationId, ids),
              ),
            ),
        ]);

  const money = new Map<
    string,
    {
      accommodation: number;
      other: number;
      deposit: number;
      paid: number;
      refunded: number;
      depositPaid: number;
      depositRefunded: number;
    }
  >();
  const entry = (id: string) => {
    let value = money.get(id);
    if (!value) {
      value = {
        accommodation: 0,
        other: 0,
        deposit: 0,
        paid: 0,
        refunded: 0,
        depositPaid: 0,
        depositRefunded: 0,
      };
      money.set(id, value);
    }
    return value;
  };
  for (const charge of charges) {
    const total = charge.quantity * charge.unitAmountCents;
    const value = entry(charge.reservationId);
    if (charge.isRefundableDeposit || charge.type === "security_deposit")
      value.deposit += total;
    else if (charge.type === "accommodation") value.accommodation += total;
    else value.other += total;
  }
  for (const payment of payments) {
    const value = entry(payment.reservationId);
    if (payment.allocation === "booking") value.paid += payment.amountCents;
    else value.depositPaid += payment.amountCents;
  }
  for (const refund of refunds) {
    const value = entry(refund.reservationId);
    if (refund.allocation === "booking") value.refunded += refund.amountCents;
    else value.depositRefunded += refund.amountCents;
  }

  const csv = toCsv(
    [
      "Reservation ID",
      "Platform reference",
      "Status",
      "Property",
      "Unit",
      "Guest",
      "Guest email",
      "Guest phone",
      "Channel",
      "Check-in",
      "Check-out",
      "Nights",
      "Guests",
      "Accommodation (PHP)",
      "Fees & discounts (PHP)",
      "Booking total (PHP)",
      "Booking paid (PHP)",
      "Booking refunded (PHP)",
      "Booking balance (PHP)",
      "Security deposit (PHP)",
      "Deposit paid (PHP)",
      "Deposit refunded (PHP)",
      "Booked on",
      "Cancelled on",
      "Cancel reason",
    ],
    rows.map((row) => {
      const m = entry(row.id);
      const total = m.accommodation + m.other;
      return [
        row.id,
        row.platformReference,
        row.status,
        row.property,
        row.unit,
        row.guest,
        row.guestEmail,
        row.guestPhone,
        row.platform ?? (row.source === "direct" ? "Direct" : row.source),
        row.checkInDate,
        row.checkOutDate,
        nightsBetween(row.checkInDate, row.checkOutDate),
        row.guestCount,
        centavosToDecimal(m.accommodation),
        centavosToDecimal(m.other),
        centavosToDecimal(total),
        centavosToDecimal(m.paid),
        centavosToDecimal(m.refunded),
        centavosToDecimal(total - m.paid + m.refunded),
        centavosToDecimal(m.deposit),
        centavosToDecimal(m.depositPaid),
        centavosToDecimal(m.depositRefunded),
        manilaStamp(row.createdAt),
        manilaStamp(row.cancelledAt),
        row.cancelReason,
      ];
    }),
  );
  return { filename: filename("bookings", filters), csv };
}

/** Cash ledger: payments in, refunds out (negative), newest last. */
export async function exportPayments(
  organizationId: string,
  filters: ExportFilters,
): Promise<CsvExport> {
  const { startUtc, endUtc } = validate(filters);
  const { propertyId } = filters;
  const scope = propertyId ? eq(units.propertyId, propertyId) : undefined;
  const stayJoin = (table: typeof paymentEntries | typeof refundEntries) =>
    and(
      eq(table.reservationId, reservations.id),
      eq(table.organizationId, reservations.organizationId),
    );
  const [payments, refunds] = await Promise.all([
    db
      .select({
        at: paymentEntries.receivedAt,
        allocation: paymentEntries.allocation,
        method: paymentEntries.method,
        amountCents: paymentEntries.amountCents,
        note: paymentEntries.reference,
        reversalOfId: paymentEntries.reversalOfId,
        reservationId: reservations.id,
        platformReference: reservations.platformReference,
        property: properties.name,
        unit: units.name,
        guest: guests.name,
      })
      .from(paymentEntries)
      .innerJoin(reservations, stayJoin(paymentEntries))
      .innerJoin(
        units,
        and(
          eq(reservations.unitId, units.id),
          eq(reservations.organizationId, units.organizationId),
        ),
      )
      .innerJoin(properties, eq(units.propertyId, properties.id))
      .innerJoin(guests, eq(reservations.guestId, guests.id))
      .where(
        and(
          eq(paymentEntries.organizationId, organizationId),
          gte(paymentEntries.receivedAt, startUtc),
          lt(paymentEntries.receivedAt, endUtc),
          scope,
        ),
      ),
    db
      .select({
        at: refundEntries.refundedAt,
        allocation: refundEntries.allocation,
        method: refundEntries.method,
        amountCents: refundEntries.amountCents,
        note: refundEntries.reason,
        reservationId: reservations.id,
        platformReference: reservations.platformReference,
        property: properties.name,
        unit: units.name,
        guest: guests.name,
      })
      .from(refundEntries)
      .innerJoin(reservations, stayJoin(refundEntries))
      .innerJoin(
        units,
        and(
          eq(reservations.unitId, units.id),
          eq(reservations.organizationId, units.organizationId),
        ),
      )
      .innerJoin(properties, eq(units.propertyId, properties.id))
      .innerJoin(guests, eq(reservations.guestId, guests.id))
      .where(
        and(
          eq(refundEntries.organizationId, organizationId),
          gte(refundEntries.refundedAt, startUtc),
          lt(refundEntries.refundedAt, endUtc),
          scope,
        ),
      ),
  ]);

  const lines = [
    ...payments.map((row) => ({
      ...row,
      type: row.reversalOfId ? "Payment (correction)" : "Payment",
      signed: row.amountCents,
    })),
    ...refunds.map((row) => ({
      ...row,
      type: "Refund",
      signed: -row.amountCents,
    })),
  ].sort((a, b) => a.at.getTime() - b.at.getTime());

  const csv = toCsv(
    [
      "Date & time (Manila)",
      "Type",
      "Applies to",
      "Method",
      "Amount (PHP)",
      "Reference / reason",
      "Guest",
      "Property",
      "Unit",
      "Platform reference",
      "Reservation ID",
    ],
    lines.map((row) => [
      manilaStamp(row.at),
      row.type,
      row.allocation === "booking" ? "Booking" : "Security deposit",
      row.method,
      centavosToDecimal(row.signed),
      row.note,
      row.guest,
      row.property,
      row.unit,
      row.platformReference,
      row.reservationId,
    ]),
  );
  return { filename: filename("payments", filters), csv };
}

export async function exportExpenses(
  organizationId: string,
  filters: ExportFilters,
): Promise<CsvExport> {
  validate(filters);
  const { from, to, propertyId } = filters;
  const rows = await db
    .select({
      paidDate: expenses.paidDate,
      category: expenses.category,
      description: expenses.description,
      payee: expenses.payee,
      paymentMethod: expenses.paymentMethod,
      receiptKey: expenses.receiptKey,
      classification: expenses.classification,
      amountCents: expenses.amountCents,
      property: properties.name,
      unit: units.name,
    })
    .from(expenses)
    .leftJoin(properties, eq(expenses.propertyId, properties.id))
    .leftJoin(units, eq(expenses.unitId, units.id))
    .where(
      and(
        eq(expenses.organizationId, organizationId),
        gte(expenses.paidDate, from),
        lt(expenses.paidDate, to),
        isNull(expenses.voidedAt),
        propertyId ? eq(expenses.propertyId, propertyId) : undefined,
      ),
    )
    .orderBy(asc(expenses.paidDate), asc(expenses.createdAt));
  const csv = toCsv(
    [
      "Paid date",
      "Category",
      "Description",
      "Classification",
      "Paid to",
      "Paid via",
      "Receipt on file",
      "Amount (PHP)",
      "Property",
      "Unit",
    ],
    rows.map((row) => [
      row.paidDate,
      row.category,
      row.description,
      row.classification,
      row.payee,
      row.paymentMethod,
      row.receiptKey ? "yes" : "no",
      centavosToDecimal(row.amountCents),
      row.property,
      row.unit,
    ]),
  );
  return { filename: filename("expenses", filters), csv };
}
