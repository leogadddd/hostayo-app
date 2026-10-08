"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import {
  requireMembership,
  assertCan,
  PermissionError,
} from "@/lib/auth/session";
import {
  createExpense,
  ExpenseError,
  updateExpense,
  voidExpense,
} from "@/server/expenses/service";
import { imageUploadFromForm } from "@/server/inventory/image-upload";
import {
  discardInventoryPhoto,
  storeInventoryPhoto,
} from "@/server/inventory/photos";
import { InventoryError } from "@/server/inventory/validation";
import { StorageError } from "@/server/storage/service";
import { unexpectedErrorMessage } from "@/lib/errors";

export interface ExpenseFormState {
  error?: string;
  success?: boolean;
}

function readString(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function toFormError(error: unknown): ExpenseFormState {
  if (
    error instanceof ExpenseError ||
    error instanceof PermissionError ||
    error instanceof InventoryError
  ) {
    return { error: error.message };
  }
  if (error instanceof StorageError) {
    return { error: "The receipt couldn’t be saved. Try again." };
  }
  if (error instanceof ZodError) {
    const first = error.issues[0];
    return { error: first ? first.message : "Check the form and try again." };
  }
  return { error: unexpectedErrorMessage(error, "expenses") };
}

function expenseData(formData: FormData) {
  return {
    propertyId: readString(formData, "propertyId") || undefined,
    unitId: readString(formData, "unitId") || undefined,
    amountPesos: readString(formData, "amountPesos"),
    category: readString(formData, "category"),
    description: readString(formData, "description"),
    classification: readString(formData, "classification"),
    paidDate: readString(formData, "paidDate"),
    payee: readString(formData, "payee") || undefined,
    paymentMethod: readString(formData, "paymentMethod") || undefined,
  };
}

export async function createExpenseAction(
  _prev: ExpenseFormState,
  formData: FormData,
): Promise<ExpenseFormState> {
  const membership = await requireMembership();
  assertCan(membership, "expenses.create");
  let receiptKey: string | null = null;
  try {
    const upload = await imageUploadFromForm(formData, "receipt");
    if (upload) {
      receiptKey = await storeInventoryPhoto(membership.organizationId, upload);
    }
    await createExpense({
      organizationId: membership.organizationId,
      actorUserId: membership.userId,
      data: expenseData(formData),
      receiptKey,
    });
  } catch (error) {
    // The record wasn't saved, so don't leave the new receipt behind.
    await discardInventoryPhoto(membership.organizationId, receiptKey);
    return toFormError(error);
  }
  revalidatePath("/expenses");
  return { success: true };
}

export async function updateExpenseAction(
  expenseId: string,
  _prev: ExpenseFormState,
  formData: FormData,
): Promise<ExpenseFormState> {
  const membership = await requireMembership();
  assertCan(membership, "expenses.update");
  let newKey: string | null = null;
  try {
    const upload = await imageUploadFromForm(formData, "receipt");
    if (upload) {
      newKey = await storeInventoryPhoto(membership.organizationId, upload);
    }
    const removeReceipt = formData.get("removeReceipt") === "on";
    const { replacedReceiptKey } = await updateExpense({
      organizationId: membership.organizationId,
      actorUserId: membership.userId,
      expenseId,
      data: expenseData(formData),
      receiptKey: newKey ?? (removeReceipt ? null : undefined),
    });
    await discardInventoryPhoto(membership.organizationId, replacedReceiptKey);
  } catch (error) {
    await discardInventoryPhoto(membership.organizationId, newKey);
    return toFormError(error);
  }
  revalidatePath("/expenses");
  revalidatePath(`/expenses/${expenseId}`);
  return { success: true };
}

export async function voidExpenseAction(
  expenseId: string,
  _prev: ExpenseFormState,
  formData: FormData,
): Promise<ExpenseFormState> {
  const membership = await requireMembership();
  assertCan(membership, "expenses.update");
  try {
    await voidExpense({
      organizationId: membership.organizationId,
      actorUserId: membership.userId,
      expenseId,
      data: { reason: readString(formData, "reason") },
    });
  } catch (error) {
    return toFormError(error);
  }
  revalidatePath("/expenses");
  revalidatePath(`/expenses/${expenseId}`);
  return { success: true };
}
