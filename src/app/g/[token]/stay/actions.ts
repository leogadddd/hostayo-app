"use server";

import { revalidatePath } from "next/cache";
import { findActiveGuestToken } from "@/server/reservations/guest-link";
import { getReservationDetail } from "@/server/reservations/service";
import {
  checkOut,
  createDamageReport,
  OperationsError,
} from "@/server/operations/service";
import { ReservationError } from "@/server/reservations/validation";

export interface GuestStayActionState {
  error?: string;
  success?: boolean;
}

async function activeToken(token: string) {
  const resolved = await findActiveGuestToken(token);
  if (!resolved)
    throw new OperationsError(
      "This link is no longer valid. Please ask your host for a new one.",
    );
  return resolved;
}

function errorState(error: unknown): GuestStayActionState {
  if (error instanceof OperationsError || error instanceof ReservationError) {
    return { error: error.message };
  }
  return { error: "We couldn’t save that just now. Please try again." };
}

/** A guest may check out only the reservation represented by their active link. */
export async function guestCheckOutAction(
  token: string,
): Promise<GuestStayActionState> {
  try {
    const link = await activeToken(token);
    await checkOut({
      organizationId: link.organizationId,
      actorUserId: null,
      reservationId: link.reservationId,
      data: { note: "Guest checked out using their stay link." },
    });
    revalidatePath(`/g/${encodeURIComponent(token)}`);
    revalidatePath(`/g/${encodeURIComponent(token)}/stay`);
    revalidatePath("/tasks");
    return { success: true };
  } catch (error) {
    return errorState(error);
  }
}

/** A guest report is always attached to the reservation behind their link. */
export async function guestDamageReportAction(
  token: string,
  description: string,
): Promise<GuestStayActionState> {
  try {
    const link = await activeToken(token);
    // The operations service owns validation and persistence. Photo uploads are
    // deliberately not claimed here until the storage-backed damage-photo model exists.
    const { reservation } = await getReservationDetail(
      link.organizationId,
      link.reservationId,
    );
    await createDamageReport({
      organizationId: link.organizationId,
      actorUserId: null,
      unitId: reservation.unitId,
      reservationId: link.reservationId,
      data: { description },
    });
    revalidatePath("/tasks");
    revalidatePath(`/reservations/${link.reservationId}`);
    return { success: true };
  } catch (error) {
    return errorState(error);
  }
}
