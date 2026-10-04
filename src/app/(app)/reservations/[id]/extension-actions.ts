"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { requireMembership, assertCan, PermissionError } from "@/lib/auth/session";
import { can } from "@/lib/permissions";
import { unexpectedErrorMessage } from "@/lib/errors";
import {
  approveExtension,
  cancelExtensionRequest,
  declineExtension,
  removeExtension,
  requestExtension,
} from "@/server/reservations/extensions";
import { ReservationError } from "@/server/reservations/validation";

export interface ExtensionFormState {
  error?: string;
  success?: boolean;
}

function toFormError(error: unknown): ExtensionFormState {
  if (error instanceof ReservationError || error instanceof PermissionError) return { error: error.message };
  if (error instanceof ZodError) return { error: error.issues[0]?.message ?? "Check the form and try again." };
  return { error: unexpectedErrorMessage(error, "reservations") };
}

function readString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function revalidateStay() {
  revalidatePath("/reservations/[id]", "page");
  revalidatePath("/reservations");
  revalidatePath("/calendar");
  revalidatePath("/dashboard");
}

export async function requestExtensionAction(
  reservationId: string,
  _prev: ExtensionFormState,
  formData: FormData,
): Promise<ExtensionFormState> {
  const membership = await requireMembership();
  try {
    assertCan(membership, "extensions.create");
    await requestExtension({
      organizationId: membership.organizationId,
      actorUserId: membership.userId,
      reservationId,
      data: { hours: Number(formData.get("hours")), note: readString(formData, "note") || undefined },
    });
  } catch (error) {
    return toFormError(error);
  }
  revalidateStay();
  return { success: true };
}

export async function approveExtensionAction(
  reservationId: string,
  extensionId: string,
  _prev: ExtensionFormState,
  formData: FormData,
): Promise<ExtensionFormState> {
  const membership = await requireMembership();
  try {
    assertCan(membership, "extensions.update");
    await approveExtension({
      organizationId: membership.organizationId,
      actorUserId: membership.userId,
      reservationId,
      extensionId,
      // Changing the price is setting a charge, so it needs payments.create too.
      canSetRate: can(membership, "payments.create"),
      data: { hourlyRatePesos: readString(formData, "hourlyRatePesos") || undefined, note: readString(formData, "note") || undefined },
    });
  } catch (error) {
    return toFormError(error);
  }
  revalidateStay();
  return { success: true };
}

export async function declineExtensionAction(
  reservationId: string,
  extensionId: string,
  _prev: ExtensionFormState,
  formData: FormData,
): Promise<ExtensionFormState> {
  const membership = await requireMembership();
  try {
    assertCan(membership, "extensions.update");
    await declineExtension({
      organizationId: membership.organizationId,
      actorUserId: membership.userId,
      reservationId,
      extensionId,
      data: { note: readString(formData, "note") },
    });
  } catch (error) {
    return toFormError(error);
  }
  revalidateStay();
  return { success: true };
}

/** Returns the error rather than throwing: thrown messages are hidden in production. */
export async function cancelExtensionRequestAction(reservationId: string, extensionId: string): Promise<ExtensionFormState> {
  const membership = await requireMembership();
  try {
    assertCan(membership, "extensions.create");
    await cancelExtensionRequest({ organizationId: membership.organizationId, actorUserId: membership.userId, reservationId, extensionId });
  } catch (error) {
    return toFormError(error);
  }
  revalidateStay();
  return { success: true };
}

/** Returns the error rather than throwing: thrown messages are hidden in production. */
export async function removeExtensionAction(reservationId: string, extensionId: string): Promise<ExtensionFormState> {
  const membership = await requireMembership();
  try {
    assertCan(membership, "extensions.delete");
    await removeExtension({ organizationId: membership.organizationId, actorUserId: membership.userId, reservationId, extensionId });
  } catch (error) {
    return toFormError(error);
  }
  revalidateStay();
  return { success: true };
}
