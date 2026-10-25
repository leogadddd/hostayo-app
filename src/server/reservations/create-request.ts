import { assertCan, type MembershipContext } from "@/lib/auth/session";
import { can } from "@/lib/permissions";
import { buildDefaultCharges } from "@/lib/charges";
import { unitRateResolver } from "@/lib/pricing-rules";
import { nightsBetween } from "@/lib/dates";
import { listPricingRules } from "@/server/pricing/service";
import { getUnitOrThrow } from "@/server/inventory/service";
import { createConfirmed, createHold } from "@/server/reservations/service";
import {
  ReservationError,
  reservationDetailsSchema,
  type ChargeLineInput,
} from "@/server/reservations/validation";

/** Everything the new-reservation form collects, as plain data. */
export interface CreateReservationRequest {
  mode: "hold" | "confirmed";
  idempotencyKey?: string;
  guestId?: string;
  newGuest?: {
    name: string;
    email?: string;
    phone?: string;
    notes?: string;
  };
  unitId: string;
  checkIn: string;
  checkOut: string;
  guestCount: number;
  platformId?: string;
  platformReference?: string;
  /** Only used by people who may set prices; the service re-validates each line. */
  charges?: ChargeLineInput[];
  occupantNames?: string[];
  holdMinutes?: number;
  acknowledgeUnpaid?: boolean;
  initialPayment?: {
    amountPesos: string;
    allocation: "booking" | "security_deposit";
    method: "gcash" | "maya" | "bank_transfer" | "cash";
    reference?: string;
    receivedAt?: string;
  };
}

/**
 * The create path shared by the form's server action and the JSON API the
 * offline outbox replays. Enforces the same permissions and throws the
 * service's own errors; callers turn those into a form message or a status.
 */
export async function createReservationFromRequest(
  membership: MembershipContext,
  input: CreateReservationRequest,
) {
  const mode = input.mode === "confirmed" ? "confirmed" : "hold";
  assertCan(membership, "reservations.create");
  // Booking straight to confirmed skips the hold review and records payment.
  if (mode === "confirmed") {
    assertCan(membership, "reservations.update");
    assertCan(membership, "payments.create");
  }

  const guest = input.newGuest
    ? { newGuest: input.newGuest }
    : { guestId: input.guestId ?? "" };

  const details = reservationDetailsSchema.parse({
    unitId: input.unitId,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    guestCount: input.guestCount,
    platformId: input.platformId || undefined,
    platformReference: input.platformReference || undefined,
  });
  if (details.checkOut <= details.checkIn) {
    throw new ReservationError("Check-out must be after check-in.", "checkOut");
  }
  let charges: ChargeLineInput[];
  // Only people who may set prices send their own charge lines; everyone
  // else gets the unit's standard rates.
  if (can(membership, "payments.create")) {
    charges = input.charges ?? [];
  } else {
    const unit = await getUnitOrThrow(
      membership.organizationId,
      details.unitId,
    );
    charges = buildDefaultCharges({
      nightlyRateCents: unit.defaultNightlyRateCents,
      dayRates: unit.dayRates,
      rateFor: unitRateResolver(
        unit,
        await listPricingRules(membership.organizationId, { activeOnly: true }),
      ),
      checkIn: details.checkIn,
      cleaningFeeCents: unit.cleaningFeeCents,
      securityDepositCents: unit.securityDepositCents,
      nights: nightsBetween(details.checkIn, details.checkOut),
    });
  }
  const base = {
    ...details,
    charges,
    occupantNames: input.occupantNames ?? [],
  };
  const common = {
    organizationId: membership.organizationId,
    actorUserId: membership.userId,
    guest,
    idempotencyKey: input.idempotencyKey || undefined,
  };
  return mode === "hold"
    ? createHold({
        ...common,
        data: { ...base, holdMinutes: input.holdMinutes || 1440 },
      })
    : createConfirmed({
        ...common,
        data: {
          ...base,
          acknowledgeUnpaid: Boolean(input.acknowledgeUnpaid),
          initialPayment: input.initialPayment,
        },
      });
}
