import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/session";
import { getDeviceClass } from "@/lib/device";
import { PermissionDenied } from "@/components/app/permission-denied";
import { DesktopReservations } from "./desktop";
import { MobileReservations } from "./mobile";
import { getReservationsModel, type ReservationsSearchParams } from "./model";

export const metadata: Metadata = { title: "Reservations" };

export default async function ReservationsPage({
  searchParams,
}: {
  searchParams: Promise<ReservationsSearchParams>;
}) {
  const membership = await requirePermission("reservations.view");
  if (!membership) return <PermissionDenied />;
  const params = await searchParams;
  const [model, device] = await Promise.all([
    getReservationsModel(membership, params),
    getDeviceClass(),
  ]);
  return device === "mobile" ? (
    <MobileReservations model={model} />
  ) : (
    <DesktopReservations model={model} />
  );
}
