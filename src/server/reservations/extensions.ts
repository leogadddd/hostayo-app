import "server-only";

import { and, asc, eq, gt, inArray, ne, or, sum } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  auditEvents,
  properties,
  reservationCharges,
  reservationExtensions,
  reservations,
  unitBlocks,
  units,
  user,
  type ExtensionStatus,
} from "@/lib/db/schema";
import { addDaysLocal, localDateTimeToUtc, nightsBetween } from "@/lib/dates";
import {
  extensionHourlyRateCents,
  extensionWindow,
  stayHours,
  type ExtensionWindow,
} from "@/lib/extensions";
import { MoneyParseError, pesosToCentavos } from "@/lib/money";
import { ReservationError } from "./validation";

/**
 * Late check-out is a request: staff log what the guest asked for, the system
 * checks it against the next arrival and turnover, and it changes nothing
 * until someone with `extensions.update` approves it. Requests close at the
 * stay's check-out time. Only approved hours move the departure.
 */

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Executor = Tx | typeof db;

const HOUR_MS = 3_600_000;
const requester = alias(user, "requester");
const decider = alias(user, "decider");

export interface ExtensionRecord {
  id: string;
  status: ExtensionStatus;
  hours: number;
  hourlyRateCents: number;
  note: string | null;
  createdAt: Date;
  requestedBy: string | null;
  decidedAt: Date | null;
  decidedBy: string | null;
  decisionNote: string | null;
}

export interface ExtensionState {
  /** Why a new request can't be made right now; null when it can. */
  requestBlockedReason: string | null;
  enabled: boolean;
  status: string;
  checkoutAt: Date;
  /** Departure with approved extensions. */
  departureAt: Date;
  /** Approved hours only. */
  extendedHours: number;
  /** Room left after approved hours (requests don't hold any). */
  window: ExtensionWindow;
  /** The rate a request is quoted at. */
  hourlyRateCents: number;
  /** True when the unit sets its own rate instead of the stay-based default. */
  unitRate: boolean;
  nextArrival: { at: Date; label: string } | null;
  turnoverMinutes: number;
  maxHours: number;
  timezone: string;
  /** The request waiting for a decision, if any. */
  openRequest: ExtensionRecord | null;
  /** Every request, oldest first. */
  extensions: ExtensionRecord[];
}

/**
 * Everything the reservation page and the request and review forms need. Pass
 * a transaction to read it under the reservation's row lock.
 */
export async function getExtensionState(
  organizationId: string,
  reservationId: string,
  executor: Executor = db,
): Promise<ExtensionState> {
  const [row] = await executor
    .select({ reservation: reservations, unit: units, property: properties })
    .from(reservations)
    .innerJoin(
      units,
      and(
        eq(reservations.unitId, units.id),
        eq(reservations.organizationId, units.organizationId),
      ),
    )
    .innerJoin(
      properties,
      and(
        eq(units.propertyId, properties.id),
        eq(units.organizationId, properties.organizationId),
      ),
    )
    .where(
      and(
        eq(reservations.id, reservationId),
        eq(reservations.organizationId, organizationId),
      ),
    )
    .limit(1);
  if (!row)
    throw new ReservationError("Reservation not found.", "reservationId");
  const { reservation, unit, property } = row;
  const timezone = property.timezone;
  const checkOutDate = reservation.checkOutDate;

  const [extensionRows, accommodation, nextStays, blocks] = await Promise.all([
    executor
      .select({
        id: reservationExtensions.id,
        status: reservationExtensions.status,
        hours: reservationExtensions.hours,
        hourlyRateCents: reservationExtensions.hourlyRateCents,
        note: reservationExtensions.note,
        createdAt: reservationExtensions.createdAt,
        requestedBy: requester.name,
        decidedAt: reservationExtensions.decidedAt,
        decidedBy: decider.name,
        decisionNote: reservationExtensions.decisionNote,
      })
      .from(reservationExtensions)
      .leftJoin(requester, eq(reservationExtensions.createdBy, requester.id))
      .leftJoin(decider, eq(reservationExtensions.decidedBy, decider.id))
      .where(
        and(
          eq(reservationExtensions.reservationId, reservation.id),
          eq(reservationExtensions.organizationId, organizationId),
        ),
      )
      .orderBy(asc(reservationExtensions.createdAt)),
    executor
      .select({ amountCents: reservationCharges.amountCents })
      .from(reservationCharges)
      .where(
        and(
          eq(reservationCharges.reservationId, reservation.id),
          eq(reservationCharges.organizationId, organizationId),
          eq(reservationCharges.type, "accommodation"),
        ),
      ),
    // Only a same-day arrival matters: extensions never run past midnight.
    executor
      .select({ id: reservations.id })
      .from(reservations)
      .where(
        and(
          eq(reservations.organizationId, organizationId),
          eq(reservations.unitId, unit.id),
          eq(reservations.checkInDate, checkOutDate),
          ne(reservations.id, reservation.id),
          or(
            inArray(reservations.status, ["confirmed", "checked_in"]),
            and(
              eq(reservations.status, "hold"),
              gt(reservations.expiresAt, new Date()),
            ),
          ),
        ),
      )
      .limit(1),
    executor
      .select({ reason: unitBlocks.reason })
      .from(unitBlocks)
      .where(
        and(
          eq(unitBlocks.organizationId, organizationId),
          eq(unitBlocks.unitId, unit.id),
          eq(unitBlocks.startDate, checkOutDate),
        ),
      )
      .limit(1),
  ]);

  const checkoutAt = localDateTimeToUtc(
    `${checkOutDate}T${unit.checkOutTime}`,
    timezone,
  );
  const dayEndsAt = localDateTimeToUtc(
    `${addDaysLocal(checkOutDate, 1)}T00:00`,
    timezone,
  );
  const arrivalAt = localDateTimeToUtc(
    `${checkOutDate}T${unit.checkInTime}`,
    timezone,
  );
  if (!checkoutAt || !dayEndsAt || !arrivalAt)
    throw new ReservationError("This unit's check-out time couldn't be read.");

  // A block starting that day takes the unit from the usual check-in time.
  const nextArrival =
    nextStays.length > 0
      ? { at: arrivalAt, label: "Next guest arrives" }
      : blocks[0]
        ? { at: arrivalAt, label: `Blocked (${blocks[0].reason})` }
        : null;
  const extendedHours = extensionRows
    .filter((extension) => extension.status === "approved")
    .reduce((total, extension) => total + extension.hours, 0);
  const window = extensionWindow({
    checkoutAt,
    extendedHours,
    maxHours: unit.maxExtensionHours,
    turnoverMinutes: property.turnoverDurationMinutes,
    nextArrivalAt: nextArrival?.at ?? null,
    dayEndsAt,
  });
  const accommodationCents = accommodation.reduce(
    (total, line) => total + line.amountCents,
    0,
  );
  const hours = stayHours(
    nightsBetween(reservation.checkInDate, checkOutDate),
    unit.checkInTime,
    unit.checkOutTime,
  );
  const openRequest =
    extensionRows.find((extension) => extension.status === "requested") ?? null;
  const time = new Intl.DateTimeFormat("en-PH", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  });

  let requestBlockedReason: string | null = null;
  if (
    reservation.status !== "confirmed" &&
    reservation.status !== "checked_in"
  ) {
    requestBlockedReason =
      "Only a confirmed or checked-in stay can request late check-out.";
  } else if (!unit.extensionsEnabled) {
    requestBlockedReason = "Late check-out is turned off for this unit.";
  } else if (Date.now() >= window.departureAt.getTime()) {
    requestBlockedReason = `Requests close at check-out time (${time.format(window.departureAt)}).`;
  } else if (openRequest) {
    requestBlockedReason = "A request is already waiting for approval.";
  } else if (window.availableHours === 0) {
    requestBlockedReason =
      window.limitedBy === "next_arrival"
        ? "The next arrival leaves no room for turnover after extra hours."
        : window.limitedBy === "unit_limit"
          ? `This stay already has the unit's maximum of ${unit.maxExtensionHours} extra hours.`
          : "The stay already runs to the end of the check-out day.";
  }

  return {
    requestBlockedReason,
    enabled: unit.extensionsEnabled,
    status: reservation.status,
    checkoutAt,
    departureAt: window.departureAt,
    extendedHours,
    window,
    hourlyRateCents: extensionHourlyRateCents(
      unit.extensionHourlyRateCents,
      accommodationCents,
      hours,
    ),
    unitRate: unit.extensionHourlyRateCents !== null,
    nextArrival,
    turnoverMinutes: property.turnoverDurationMinutes,
    maxHours: unit.maxExtensionHours,
    timezone,
    openRequest,
    extensions: extensionRows,
  };
}

/**
 * Whether the open request can be approved now, re-checked against the
 * current next arrival and approved hours. Null when it can.
 */
export function approvalBlockedReason(state: ExtensionState): string | null {
  const request = state.openRequest;
  if (!request) return "There's no request waiting for approval.";
  if (state.status !== "confirmed" && state.status !== "checked_in")
    return "Only a confirmed or checked-in stay can be extended.";
  if (!state.enabled) return "Late check-out is turned off for this unit.";
  const until = new Date(state.departureAt.getTime() + request.hours * HOUR_MS);
  if (Date.now() >= until.getTime())
    return "The requested time has already passed. Decline the request.";
  if (request.hours > state.window.availableHours) {
    return state.window.availableHours === 0
      ? "It no longer fits: there's no room left before the next arrival's turnover or the unit's limit."
      : `It no longer fits: only ${state.window.availableHours} hour${state.window.availableHours === 1 ? "" : "s"} can be added now.`;
  }
  return null;
}

async function lockReservation(
  tx: Tx,
  organizationId: string,
  reservationId: string,
) {
  // Serialize requests and decisions on this stay.
  await tx
    .select({ id: reservations.id })
    .from(reservations)
    .where(
      and(
        eq(reservations.id, reservationId),
        eq(reservations.organizationId, organizationId),
      ),
    )
    .for("update");
}

async function audit(
  tx: Tx,
  input: {
    organizationId: string;
    actorUserId: string;
    reservationId: string;
    action: string;
    metadata: Record<string, unknown>;
  },
) {
  await tx.insert(auditEvents).values({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    entity: "reservation",
    entityId: input.reservationId,
    action: input.action,
    metadata: input.metadata,
  });
}

const requestSchema = z.object({
  hours: z
    .number()
    .int("Request whole hours.")
    .min(1, "Request at least 1 hour.")
    .max(12, "Request at most 12 hours."),
  note: z
    .string()
    .trim()
    .max(300, "Keep the note under 300 characters.")
    .optional(),
});

/** Logs the guest's request. It fits when made; nothing changes until it's approved. */
export async function requestExtension(input: {
  organizationId: string;
  actorUserId: string;
  reservationId: string;
  data: unknown;
}) {
  const data = requestSchema.parse(input.data);
  return db.transaction(async (tx) => {
    await lockReservation(tx, input.organizationId, input.reservationId);
    const state = await getExtensionState(
      input.organizationId,
      input.reservationId,
      tx,
    );
    if (state.requestBlockedReason)
      throw new ReservationError(state.requestBlockedReason);
    if (data.hours > state.window.availableHours) {
      throw new ReservationError(
        `Only ${state.window.availableHours} hour${state.window.availableHours === 1 ? "" : "s"} fit before ${state.window.limitedBy === "next_arrival" ? "the next arrival's turnover" : state.window.limitedBy === "unit_limit" ? "the unit's limit" : "midnight"}.`,
        "hours",
      );
    }
    const [request] = await tx
      .insert(reservationExtensions)
      .values({
        organizationId: input.organizationId,
        reservationId: input.reservationId,
        status: "requested",
        hours: data.hours,
        hourlyRateCents: state.hourlyRateCents,
        note: data.note || null,
        createdBy: input.actorUserId,
      })
      .returning();
    if (!request) throw new ReservationError("Failed to save the request.");
    await audit(tx, {
      ...input,
      action: "reservation.extension_requested",
      metadata: {
        extensionId: request.id,
        hours: data.hours,
        quotedHourlyRateCents: state.hourlyRateCents,
      },
    });
    return request;
  });
}

const approveSchema = z.object({
  /** Pesos; empty keeps the quoted rate. Only honoured for people who set prices. */
  hourlyRatePesos: z.string().trim().max(20).optional(),
  note: z
    .string()
    .trim()
    .max(300, "Keep the note under 300 characters.")
    .optional(),
});

function formatTime(value: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-PH", {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(value);
}

/** Approves the open request: re-checks it fits, adds the charge, moves the departure. */
export async function approveExtension(input: {
  organizationId: string;
  actorUserId: string;
  reservationId: string;
  extensionId: string;
  canSetRate: boolean;
  data: unknown;
}) {
  const data = approveSchema.parse(input.data);
  let customRateCents: number | null = null;
  if (input.canSetRate && data.hourlyRatePesos) {
    try {
      customRateCents = pesosToCentavos(data.hourlyRatePesos, {
        allowZero: true,
      });
    } catch (error) {
      if (error instanceof MoneyParseError)
        throw new ReservationError(
          "Enter the hourly rate like 250 or 250.50.",
          "hourlyRatePesos",
        );
      throw error;
    }
  }

  return db.transaction(async (tx) => {
    await lockReservation(tx, input.organizationId, input.reservationId);
    const state = await getExtensionState(
      input.organizationId,
      input.reservationId,
      tx,
    );
    const request = state.openRequest;
    if (!request || request.id !== input.extensionId)
      throw new ReservationError("This request was already decided.");
    const blocked = approvalBlockedReason(state);
    if (blocked) throw new ReservationError(blocked);

    const rateCents = customRateCents ?? request.hourlyRateCents;
    const until = new Date(
      state.departureAt.getTime() + request.hours * HOUR_MS,
    );
    const [charge] = await tx
      .insert(reservationCharges)
      .values({
        organizationId: input.organizationId,
        reservationId: input.reservationId,
        type: "extension",
        description: `Late check-out until ${formatTime(until, state.timezone)}`,
        quantity: request.hours,
        unitAmountCents: rateCents,
        amountCents: request.hours * rateCents,
        isRefundableDeposit: false,
      })
      .returning({ id: reservationCharges.id });
    if (!charge)
      throw new ReservationError("Failed to add the late check-out charge.");
    await tx
      .update(reservationExtensions)
      .set({
        status: "approved",
        chargeId: charge.id,
        hourlyRateCents: rateCents,
        decidedBy: input.actorUserId,
        decidedAt: new Date(),
        decisionNote: data.note || null,
      })
      .where(
        and(
          eq(reservationExtensions.id, request.id),
          eq(reservationExtensions.status, "requested"),
        ),
      );
    await tx
      .update(reservations)
      .set({ updatedAt: new Date() })
      .where(eq(reservations.id, input.reservationId));
    await audit(tx, {
      ...input,
      action: "reservation.extension_approved",
      metadata: {
        extensionId: request.id,
        hours: request.hours,
        hourlyRateCents: rateCents,
        departureAt: until.toISOString(),
      },
    });
  });
}

const declineSchema = z.object({
  note: z
    .string()
    .trim()
    .min(2, "Say why it was declined.")
    .max(300, "Keep the note under 300 characters."),
});

/** Declines the open request, keeping it with the reason. */
export async function declineExtension(input: {
  organizationId: string;
  actorUserId: string;
  reservationId: string;
  extensionId: string;
  data: unknown;
}) {
  const data = declineSchema.parse(input.data);
  return db.transaction(async (tx) => {
    await lockReservation(tx, input.organizationId, input.reservationId);
    const [declined] = await tx
      .update(reservationExtensions)
      .set({
        status: "declined",
        decidedBy: input.actorUserId,
        decidedAt: new Date(),
        decisionNote: data.note,
      })
      .where(
        and(
          eq(reservationExtensions.id, input.extensionId),
          eq(reservationExtensions.reservationId, input.reservationId),
          eq(reservationExtensions.organizationId, input.organizationId),
          eq(reservationExtensions.status, "requested"),
        ),
      )
      .returning();
    if (!declined)
      throw new ReservationError("This request was already decided.");
    await audit(tx, {
      ...input,
      action: "reservation.extension_declined",
      metadata: {
        extensionId: declined.id,
        hours: declined.hours,
        reason: data.note,
      },
    });
  });
}

/** Withdraws a request before it's decided (the guest changed their mind). */
export async function cancelExtensionRequest(input: {
  organizationId: string;
  actorUserId: string;
  reservationId: string;
  extensionId: string;
}) {
  return db.transaction(async (tx) => {
    await lockReservation(tx, input.organizationId, input.reservationId);
    const [removed] = await tx
      .delete(reservationExtensions)
      .where(
        and(
          eq(reservationExtensions.id, input.extensionId),
          eq(reservationExtensions.reservationId, input.reservationId),
          eq(reservationExtensions.organizationId, input.organizationId),
          eq(reservationExtensions.status, "requested"),
        ),
      )
      .returning();
    if (!removed)
      throw new ReservationError("This request was already decided.");
    await audit(tx, {
      ...input,
      action: "reservation.extension_request_cancelled",
      metadata: { extensionId: removed.id, hours: removed.hours },
    });
  });
}

/** Removes an approved extension and its charge, while the guest hasn't checked out. */
export async function removeExtension(input: {
  organizationId: string;
  actorUserId: string;
  reservationId: string;
  extensionId: string;
}) {
  return db.transaction(async (tx) => {
    const [reservation] = await tx
      .select({ status: reservations.status })
      .from(reservations)
      .where(
        and(
          eq(reservations.id, input.reservationId),
          eq(reservations.organizationId, input.organizationId),
        ),
      )
      .for("update");
    if (!reservation)
      throw new ReservationError("Reservation not found.", "reservationId");
    if (
      reservation.status !== "confirmed" &&
      reservation.status !== "checked_in"
    ) {
      throw new ReservationError(
        "Late check-out can only be removed before check-out.",
      );
    }
    const [extension] = await tx
      .select()
      .from(reservationExtensions)
      .where(
        and(
          eq(reservationExtensions.id, input.extensionId),
          eq(reservationExtensions.reservationId, input.reservationId),
          eq(reservationExtensions.organizationId, input.organizationId),
          eq(reservationExtensions.status, "approved"),
        ),
      )
      .limit(1);
    if (!extension?.chargeId)
      throw new ReservationError("That late check-out was already removed.");
    // Deleting the charge cascades to the extension.
    await tx
      .delete(reservationCharges)
      .where(
        and(
          eq(reservationCharges.id, extension.chargeId),
          eq(reservationCharges.organizationId, input.organizationId),
        ),
      );
    await tx
      .update(reservations)
      .set({ updatedAt: new Date() })
      .where(eq(reservations.id, input.reservationId));
    await audit(tx, {
      ...input,
      action: "reservation.extension_removed",
      metadata: {
        extensionId: extension.id,
        hours: extension.hours,
        hourlyRateCents: extension.hourlyRateCents,
      },
    });
  });
}

/** Approved late check-out hours per reservation, for lists and calendars. Reservations without any are left out. */
export async function getExtensionHours(
  organizationId: string,
  reservationIds: string[],
): Promise<Map<string, number>> {
  if (reservationIds.length === 0) return new Map();
  const rows = await db
    .select({
      reservationId: reservationExtensions.reservationId,
      hours: sum(reservationExtensions.hours).mapWith(Number),
    })
    .from(reservationExtensions)
    .where(
      and(
        eq(reservationExtensions.organizationId, organizationId),
        eq(reservationExtensions.status, "approved"),
        inArray(reservationExtensions.reservationId, [
          ...new Set(reservationIds),
        ]),
      ),
    )
    .groupBy(reservationExtensions.reservationId);
  return new Map(rows.map((row) => [row.reservationId, row.hours]));
}

/** Open late check-out requests per reservation (hours asked for), for the dashboard and calendar. */
export async function getPendingExtensionHours(
  organizationId: string,
  reservationIds: string[],
): Promise<Map<string, number>> {
  if (reservationIds.length === 0) return new Map();
  const rows = await db
    .select({
      reservationId: reservationExtensions.reservationId,
      hours: reservationExtensions.hours,
    })
    .from(reservationExtensions)
    .where(
      and(
        eq(reservationExtensions.organizationId, organizationId),
        eq(reservationExtensions.status, "requested"),
        inArray(reservationExtensions.reservationId, [
          ...new Set(reservationIds),
        ]),
      ),
    );
  return new Map(rows.map((row) => [row.reservationId, row.hours]));
}
