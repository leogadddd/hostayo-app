"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import {
  requireMembership,
  assertCan,
  PermissionError,
} from "@/lib/auth/session";
import { can } from "@/lib/permissions";
import {
  cancelReservation,
  confirmHold,
  updateReservation,
} from "@/server/reservations/service";
import { createReservationFromRequest } from "@/server/reservations/create-request";
import {
  createGuestLink,
  revokeGuestLink,
} from "@/server/reservations/guest-link";
import {
  checkIn,
  checkOut,
  OperationsError,
} from "@/server/operations/service";
import { ReservationError } from "@/server/reservations/validation";
import { InventoryError } from "@/server/inventory/validation";
import { MoneyParseError, pesosToCentavos } from "@/lib/money";
import type { ChargeLineInput } from "@/server/reservations/validation";
import { unexpectedErrorMessage } from "@/lib/errors";

export interface ReservationFormState {
  error?: string;
  success?: boolean;
  reservationId?: string;
}

function readString(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function toFormError(error: unknown): ReservationFormState {
  if (
    error instanceof ReservationError ||
    error instanceof InventoryError ||
    error instanceof MoneyParseError
  ) {
    return { error: error.message };
  }
  if (error instanceof OperationsError) {
    return { error: error.message };
  }
  if (error instanceof PermissionError) {
    return { error: error.message };
  }
  if (error instanceof ZodError) {
    const first = error.issues[0];
    return { error: first ? first.message : "Check the form and try again." };
  }
  if (error instanceof SyntaxError) {
    return {
      error: "The charge breakdown could not be read. Refresh and try again.",
    };
  }
  return { error: unexpectedErrorMessage(error, "reservations") };
}

function readCharges(formData: FormData): unknown {
  return JSON.parse(readString(formData, "chargesJson") || "[]");
}

// The service re-validates every line with chargeLineSchema before writing;
// this cast only bridges the JSON boundary of the form.
function readChargeLines(formData: FormData): ChargeLineInput[] {
  return readCharges(formData) as ChargeLineInput[];
}

export async function createReservationAction(
  _prev: ReservationFormState,
  formData: FormData,
): Promise<ReservationFormState> {
  const membership = await requireMembership();
  // Refusals by role throw, as they always have; only the service's own
  // errors become a form message.
  assertCan(membership, "reservations.create");
  if (readString(formData, "mode") === "confirmed") {
    assertCan(membership, "reservations.update");
    assertCan(membership, "payments.create");
  }
  const guestMode =
    readString(formData, "guestMode") === "new" ? "new" : "existing";
  try {
    const reservation = await createReservationFromRequest(membership, {
      mode: readString(formData, "mode") === "confirmed" ? "confirmed" : "hold",
      idempotencyKey: readString(formData, "idempotencyKey") || undefined,
      ...(guestMode === "new"
        ? {
            newGuest: {
              name: readString(formData, "guestName"),
              email: readString(formData, "guestEmail") || undefined,
              phone: readString(formData, "guestPhone") || undefined,
              notes: readString(formData, "guestNotes") || undefined,
            },
          }
        : { guestId: readString(formData, "guestId") }),
      unitId: readString(formData, "unitId"),
      checkIn: readString(formData, "checkIn"),
      checkOut: readString(formData, "checkOut"),
      guestCount: Number(readString(formData, "guestCount") || "1"),
      platformId: readString(formData, "platformId") || undefined,
      platformReference: readString(formData, "platformReference") || undefined,
      // Parsed only for people who may set prices; the service validates each line.
      charges: can(membership, "payments.create")
        ? readChargeLines(formData)
        : undefined,
      occupantNames: formData
        .getAll("occupantName")
        .map((value) => String(value).trim()),
      holdMinutes: Number(readString(formData, "holdMinutes") || "1440"),
      acknowledgeUnpaid: formData.get("acknowledgeUnpaid") === "on",
      initialPayment: readString(formData, "paymentAmountPesos")
        ? {
            amountPesos: readString(formData, "paymentAmountPesos"),
            allocation: readString(formData, "paymentAllocation") as
              "booking" | "security_deposit",
            method: readString(formData, "paymentMethod") as
              "gcash" | "maya" | "bank_transfer" | "cash",
            reference: readString(formData, "paymentReference") || undefined,
            receivedAt: readString(formData, "paymentReceivedAt") || undefined,
          }
        : undefined,
    });

    revalidatePath("/calendar");
    revalidatePath("/reservations");
    return { success: true, reservationId: reservation.id };
  } catch (error) {
    return toFormError(error);
  }
}

export async function confirmHoldAction(
  reservationId: string,
  _prev: ReservationFormState,
  formData: FormData,
): Promise<ReservationFormState> {
  const membership = await requireMembership();
  assertCan(membership, "reservations.update");
  try {
    await confirmHold({
      organizationId: membership.organizationId,
      actorUserId: membership.userId,
      reservationId,
      reason: readString(formData, "reason"),
    });
  } catch (error) {
    return toFormError(error);
  }
  revalidatePath(`/reservations/${reservationId}`);
  revalidatePath("/calendar");
  return { success: true };
}

export async function cancelReservationAction(
  reservationId: string,
  _prev: ReservationFormState,
  formData: FormData,
): Promise<ReservationFormState> {
  const membership = await requireMembership();
  assertCan(membership, "reservations.delete");
  try {
    await cancelReservation({
      organizationId: membership.organizationId,
      actorUserId: membership.userId,
      reservationId,
      reason: readString(formData, "reason"),
    });
  } catch (error) {
    return toFormError(error);
  }
  revalidatePath(`/reservations/${reservationId}`);
  revalidatePath("/reservations");
  revalidatePath("/calendar");
  return { success: true };
}

export async function quickCancelReservationAction(
  reservationId: string,
): Promise<ReservationFormState> {
  const membership = await requireMembership();
  assertCan(membership, "reservations.delete");
  try {
    await cancelReservation({
      organizationId: membership.organizationId,
      actorUserId: membership.userId,
      reservationId,
      reason: "Cancelled from the reservation list.",
    });
  } catch (error) {
    return toFormError(error);
  }
  revalidatePath("/reservations");
  revalidatePath(`/reservations/${reservationId}`);
  revalidatePath("/calendar");
  return { success: true };
}

export async function updateReservationAction(
  reservationId: string,
  _prev: ReservationFormState,
  formData: FormData,
): Promise<ReservationFormState> {
  const membership = await requireMembership();
  assertCan(membership, "reservations.update");
  // Edits re-price the stay.
  assertCan(membership, "payments.create");
  try {
    await updateReservation({
      organizationId: membership.organizationId,
      actorUserId: membership.userId,
      reservationId,
      data: {
        checkIn: readString(formData, "checkIn"),
        checkOut: readString(formData, "checkOut"),
        guestCount: Number(readString(formData, "guestCount")),
        platformId: readString(formData, "platformId") || undefined,
        platformReference: readString(formData, "platformReference"),
        // "new" creates a guest profile from the contact fields below.
        guestId:
          readString(formData, "guestId") === "new"
            ? undefined
            : readString(formData, "guestId") || undefined,
        primaryGuest: readString(formData, "guestName")
          ? {
              name: readString(formData, "guestName"),
              email: readString(formData, "guestEmail") || undefined,
              phone: readString(formData, "guestPhone") || undefined,
            }
          : undefined,
        unitId: readString(formData, "unitId"),
        occupantNames: formData
          .getAll("occupantName")
          .map((value) => String(value).trim()),
        charges: formData.getAll("chargeType").map((type, index) => ({
          type: String(type) as ChargeLineInput["type"],
          description: String(
            formData.getAll("chargeDescription")[index] ?? "",
          ).trim(),
          quantity: Number(formData.getAll("chargeQuantity")[index] ?? 0),
          unitAmountCents: pesosToCentavos(
            String(formData.getAll("chargeAmountPesos")[index] ?? ""),
          ),
        })),
      },
    });
  } catch (error) {
    return toFormError(error);
  }
  revalidatePath("/reservations");
  revalidatePath(`/reservations/${reservationId}`);
  revalidatePath("/calendar");
  return { success: true, reservationId };
}

export async function checkInAction(
  reservationId: string,
  _prev: ReservationFormState,
  formData: FormData,
): Promise<ReservationFormState> {
  const membership = await requireMembership();
  try {
    assertCan(membership, "stays.update");
    await checkIn({
      organizationId: membership.organizationId,
      actorUserId: membership.userId,
      reservationId,
      data: { note: readString(formData, "note") },
    });
  } catch (error) {
    return toFormError(error);
  }
  revalidatePath(`/reservations/${reservationId}`);
  revalidatePath("/calendar");
  return { success: true };
}

export async function checkOutAction(
  reservationId: string,
  _prev: ReservationFormState,
  formData: FormData,
): Promise<ReservationFormState> {
  const membership = await requireMembership();
  try {
    assertCan(membership, "stays.update");
    await checkOut({
      organizationId: membership.organizationId,
      actorUserId: membership.userId,
      reservationId,
      // Blank means "now"; the turnover starts at this actual departure time.
      data: {
        note: readString(formData, "note"),
        actualCheckoutAt: readString(formData, "actualCheckoutAt") || undefined,
      },
    });
  } catch (error) {
    return toFormError(error);
  }
  revalidatePath(`/reservations/${reservationId}`);
  revalidatePath("/calendar");
  revalidatePath("/tasks");
  return { success: true };
}

export interface GuestLinkFormState {
  error?: string;
  token?: string;
  tokenId?: string;
  rotated?: boolean;
}

export async function createGuestLinkAction(
  reservationId: string,
  _prev: GuestLinkFormState,
  _formData: FormData,
): Promise<GuestLinkFormState> {
  void _prev;
  void _formData;
  const membership = await requireMembership();
  assertCan(membership, "guests.update");
  try {
    const link = await createGuestLink({
      organizationId: membership.organizationId,
      actorUserId: membership.userId,
      reservationId,
    });
    return { token: link.token, tokenId: link.tokenId };
  } catch (error) {
    if (error instanceof ReservationError || error instanceof PermissionError) {
      return { error: error.message };
    }
    return { error: unexpectedErrorMessage(error, "reservations") };
  }
}

export async function revokeGuestLinkAction(
  reservationId: string,
  tokenId: string,
  _prev: GuestLinkFormState,
  _formData: FormData,
): Promise<GuestLinkFormState> {
  void _prev;
  void _formData;
  const membership = await requireMembership();
  assertCan(membership, "guests.update");
  try {
    await revokeGuestLink({
      organizationId: membership.organizationId,
      actorUserId: membership.userId,
      tokenId,
    });
  } catch (error) {
    if (error instanceof ReservationError || error instanceof PermissionError) {
      return { error: error.message };
    }
    return { error: unexpectedErrorMessage(error, "reservations") };
  }
  revalidatePath(`/reservations/${reservationId}`);
  return {};
}
