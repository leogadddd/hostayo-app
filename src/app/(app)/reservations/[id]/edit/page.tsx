import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { can } from "@/lib/permissions";
import { PermissionDenied } from "@/components/app/permission-denied";
import { MobileBackHeader } from "@/components/app/mobile-back-header";
import { PageHeading } from "@/components/app/page-heading";
import {
  getReservationDetail,
  ReservationError,
} from "@/server/reservations/service";
import { listGuests } from "@/server/reservations/service";
import { listPlatforms } from "@/server/reservations/platforms";
import { listOrgUnits, listProperties } from "@/server/inventory/service";
import { listPricingRules } from "@/server/pricing/service";
import { getReservationLedger } from "@/server/payments/service";
import { getDeviceClass } from "@/lib/device";
import { ReservationForm } from "../../new/reservation-form";
import { toUnitOption } from "../../new/unit-options";
import { todayInTimeZone } from "@/lib/dates";

export const metadata: Metadata = { title: "Edit reservation" };

export default async function EditReservationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const membership = await requirePermission("reservations.update");
  // Editing re-prices the stay, so it also needs permission to set charges.
  if (!membership || !can(membership, "payments.create")) {
    return (
      <PermissionDenied description="Editing a reservation changes its charges, so your role needs to update reservations and record payments." />
    );
  }
  const { id } = await params;
  const device = await getDeviceClass();
  let detail;
  try {
    detail = await getReservationDetail(membership.organizationId, id);
  } catch (error) {
    if (error instanceof ReservationError) notFound();
    throw error;
  }
  const backHref = `/reservations/${id}`;
  if (
    detail.reservation.status !== "hold" &&
    detail.reservation.status !== "confirmed"
  ) {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeading
          title="Edit reservation"
          backHref={backHref}
          backLabel="Back to reservation"
        />
        <p className="text-sm text-ink/60">
          Only a hold or confirmed reservation can be edited.
        </p>
      </div>
    );
  }

  const [guests, units, properties, ledger, platforms, pricingRules] =
    await Promise.all([
      listGuests(membership.organizationId),
      listOrgUnits(membership.organizationId),
      listProperties(membership.organizationId),
      getReservationLedger(membership.organizationId, id),
      listPlatforms(membership.organizationId, { includeInactive: true }),
      listPricingRules(membership.organizationId, { activeOnly: true }),
    ]);
  const propertyById = new Map(
    properties.map((property) => [property.id, property]),
  );
  const { reservation, guest, unit } = detail;

  return (
    <div className="min-w-0 overflow-x-clip">
      <div className="lg:hidden">
        <MobileBackHeader
          title="Edit reservation"
          subtitle={`${guest.name} · #${reservation.id.slice(0, 8).toUpperCase()}`}
          backHref={backHref}
          backLabel="Back to reservation"
        />
      </div>
      <div className="hidden lg:block">
        <PageHeading
          title="Edit reservation"
          description={`${guest.name} · #${reservation.id.slice(0, 8).toUpperCase()}. Payment history stays as an immutable ledger.`}
          backHref={backHref}
          backLabel="Back to reservation"
        />
      </div>
      <ReservationForm
        variant={device}
        canConfirm
        canSetCharges
        // The current unit stays selectable even if it is no longer active.
        units={units
          .filter(
            (candidate) =>
              candidate.status === "active" || candidate.id === unit.id,
          )
          .map((candidate) =>
            toUnitOption(candidate, propertyById.get(candidate.propertyId), {
              multipleProperties: properties.length > 1,
              showRates: true,
              pricingRules,
            }),
          )}
        // A retired platform stays selectable on the reservations that use it.
        canCreateGuest={can(membership, "guests.create")}
        platforms={platforms.filter(
          (platform) =>
            platform.isActive || platform.id === detail.reservation.platformId,
        )}
        guests={guests.map((option) => ({
          id: option.id,
          name: option.name,
          email: option.email,
          phone: option.phone,
        }))}
        defaultCheckIn={reservation.checkInDate}
        defaultCheckOut={reservation.checkOutDate}
        requestedUnitId={unit.id}
        defaultGuestCount={reservation.guestCount}
        today={todayInTimeZone(
          propertyById.get(unit.propertyId)?.timezone ?? "Asia/Manila",
        )}
        edit={{
          reservationId: reservation.id,
          guestId: guest.id,
          platformId: reservation.platformId,
          platformReference: reservation.platformReference,
          occupants: (detail.occupants ?? []).map((occupant) => occupant.name),
          charges: detail.charges.map((charge) => ({
            type: charge.type,
            description: charge.description,
            quantity: charge.quantity,
            unitAmountCents: charge.unitAmountCents,
          })),
          paid: {
            bookingCents:
              ledger.balances.paidBookingCents -
              ledger.balances.refundedBookingCents,
            depositCents: ledger.balances.depositHeldCents,
          },
        }}
      />
    </div>
  );
}
