import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { getDeviceClass } from "@/lib/device";
import { can } from "@/lib/permissions";
import { PermissionDenied } from "@/components/app/permission-denied";
import { db } from "@/lib/db";
import { nightsBetween } from "@/lib/dates";
import { getReservationLedger } from "@/server/payments/service";
import { expireStaleHolds } from "@/server/reservations/holds";
import {
  getReservationDetail,
  ReservationError,
} from "@/server/reservations/service";
import { DesktopConfirmation } from "./desktop";
import { MobileConfirmation } from "./mobile";
import type { ConfirmationData } from "./model";

export const metadata: Metadata = { title: "Reservation saved" };

export default async function ReservationConfirmationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const membership = await requirePermission("reservations.view");
  if (!membership) return <PermissionDenied />;
  const { id } = await params;
  const canSeeMoney = can(membership, "payments.view");
  await expireStaleHolds(db, membership.organizationId);

  // The reservation and its ledger don't depend on each other, so they load
  // together: one trip to the database instead of two in a row.
  const [detailResult, ledgerResult, device] = await Promise.all([
    getReservationDetail(membership.organizationId, id).then(
      (value) => ({ value }),
      (error: unknown) => ({ error }),
    ),
    canSeeMoney
      ? getReservationLedger(membership.organizationId, id).then(
          (value) => ({ value }),
          (error: unknown) => ({ error }),
        )
      : Promise.resolve(null),
    getDeviceClass(),
  ]);
  if ("error" in detailResult) {
    if (detailResult.error instanceof ReservationError) notFound();
    throw detailResult.error;
  }
  if (ledgerResult && "error" in ledgerResult) throw ledgerResult.error;

  const detail = detailResult.value;
  const { reservation, property } = detail;
  const balances = ledgerResult?.value.balances ?? null;
  const isHold = reservation.status === "hold";
  const data: ConfirmationData = {
    detail,
    balances,
    nights: nightsBetween(reservation.checkInDate, reservation.checkOutDate),
    isHold,
    expiresLabel: reservation.expiresAt
      ? new Intl.DateTimeFormat("en-PH", {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
          timeZone: property?.timezone ?? "Asia/Manila",
        }).format(reservation.expiresAt)
      : null,
    reservationHref: `/reservations/${reservation.id}`,
    shortRef: reservation.id.slice(0, 8).toUpperCase(),
    canSeeMoney,
    canConfirmHold: can(membership, "reservations.update") && isHold,
    canRecordPayment:
      can(membership, "payments.create") &&
      !isHold &&
      balances !== null &&
      balances.bookingBalanceCents > 0,
  };
  return device === "mobile" ? (
    <MobileConfirmation data={data} />
  ) : (
    <DesktopConfirmation data={data} />
  );
}
