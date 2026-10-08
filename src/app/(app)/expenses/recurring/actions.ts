"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import {
  assertCan,
  PermissionError,
  requireMembership,
} from "@/lib/auth/session";
import { ExpenseError } from "@/server/expenses/service";
import {
  confirmRecurring,
  createRecurring,
  setRecurringActive,
  skipRecurring,
  updateRecurring,
} from "@/server/expenses/recurring";
import { unexpectedErrorMessage } from "@/lib/errors";

export interface RecurringFormState {
  error?: string;
  success?: boolean;
}

function readString(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function toFormError(error: unknown): RecurringFormState {
  if (error instanceof ExpenseError || error instanceof PermissionError) {
    return { error: error.message };
  }
  if (error instanceof ZodError) {
    const first = error.issues[0];
    return { error: first ? first.message : "Check the form and try again." };
  }
  return { error: unexpectedErrorMessage(error, "recurring expenses") };
}

function templateData(formData: FormData) {
  return {
    propertyId: readString(formData, "propertyId") || undefined,
    unitId: readString(formData, "unitId") || undefined,
    amountPesos: readString(formData, "amountPesos"),
    category: readString(formData, "category"),
    description: readString(formData, "description"),
    classification: readString(formData, "classification"),
    payee: readString(formData, "payee") || undefined,
    paymentMethod: readString(formData, "paymentMethod") || undefined,
    cadence: readString(formData, "cadence"),
    dueDate: readString(formData, "dueDate"),
    endDate: readString(formData, "endDate") || undefined,
  };
}

function refresh() {
  revalidatePath("/expenses");
  revalidatePath("/expenses/recurring");
}

export async function createRecurringAction(
  _prev: RecurringFormState,
  formData: FormData,
): Promise<RecurringFormState> {
  const membership = await requireMembership();
  assertCan(membership, "expenses.create");
  try {
    await createRecurring({
      organizationId: membership.organizationId,
      actorUserId: membership.userId,
      data: templateData(formData),
    });
  } catch (error) {
    return toFormError(error);
  }
  refresh();
  return { success: true };
}

export async function updateRecurringAction(
  recurringId: string,
  _prev: RecurringFormState,
  formData: FormData,
): Promise<RecurringFormState> {
  const membership = await requireMembership();
  assertCan(membership, "expenses.update");
  try {
    await updateRecurring({
      organizationId: membership.organizationId,
      actorUserId: membership.userId,
      recurringId,
      data: templateData(formData),
    });
  } catch (error) {
    return toFormError(error);
  }
  refresh();
  return { success: true };
}

export async function setRecurringActiveAction(
  recurringId: string,
  active: boolean,
): Promise<RecurringFormState> {
  const membership = await requireMembership();
  assertCan(membership, "expenses.update");
  try {
    await setRecurringActive({
      organizationId: membership.organizationId,
      actorUserId: membership.userId,
      recurringId,
      active,
    });
  } catch (error) {
    return toFormError(error);
  }
  refresh();
  return { success: true };
}

export async function confirmRecurringAction(
  recurringId: string,
  dueDate: string,
  _prev: RecurringFormState,
  formData: FormData,
): Promise<RecurringFormState> {
  const membership = await requireMembership();
  assertCan(membership, "expenses.create");
  try {
    await confirmRecurring({
      organizationId: membership.organizationId,
      actorUserId: membership.userId,
      recurringId,
      data: {
        dueDate,
        amountPesos: readString(formData, "amountPesos") || undefined,
      },
    });
  } catch (error) {
    return toFormError(error);
  }
  refresh();
  return { success: true };
}

export async function skipRecurringAction(
  recurringId: string,
  dueDate: string,
): Promise<RecurringFormState> {
  const membership = await requireMembership();
  assertCan(membership, "expenses.create");
  try {
    await skipRecurring({
      organizationId: membership.organizationId,
      actorUserId: membership.userId,
      recurringId,
      dueDate,
    });
  } catch (error) {
    return toFormError(error);
  }
  refresh();
  return { success: true };
}
