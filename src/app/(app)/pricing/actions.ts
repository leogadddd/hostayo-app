"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import {
  assertCan,
  PermissionError,
  requireMembership,
} from "@/lib/auth/session";
import { unexpectedErrorMessage } from "@/lib/errors";
import { MoneyParseError, pesosToCentavos } from "@/lib/money";
import {
  createPricingRule,
  deletePricingRule,
  PricingRuleError,
  setPricingRuleActive,
  updatePricingRule,
  type PricingRuleInput,
} from "@/server/pricing/service";

export interface PricingFormState {
  error?: string;
  success?: boolean;
}

function toFormError(error: unknown): PricingFormState {
  if (
    error instanceof PricingRuleError ||
    error instanceof PermissionError ||
    error instanceof MoneyParseError
  )
    return { error: error.message };
  if (error instanceof ZodError)
    return {
      error: error.issues[0]?.message ?? "Check the pricing rule details.",
    };
  return { error: unexpectedErrorMessage(error, "pricing") };
}

function ruleFromForm(formData: FormData): PricingRuleInput {
  const read = (key: string) => String(formData.get(key) ?? "").trim();
  const adjustmentType = read("adjustmentType") as
    "percent" | "amount" | "fixed";
  const entered = read("adjustmentAmount");
  if (!entered)
    throw new PricingRuleError("Enter the adjustment.", "adjustment");
  let adjustmentValue: number;
  if (adjustmentType === "percent") {
    const percent = Number(entered);
    if (!Number.isFinite(percent) || percent < 0)
      throw new PricingRuleError("Enter a percentage like 20.", "adjustment");
    adjustmentValue = Math.round(percent * 100);
  } else {
    adjustmentValue = pesosToCentavos(entered, { allowZero: true });
  }
  if (adjustmentType !== "fixed" && read("direction") === "decrease")
    adjustmentValue = -adjustmentValue;
  const priority = Number(read("priority") || "100");
  return {
    name: read("name"),
    isActive: read("isActive") !== "false",
    priority,
    stacks: read("stacks") === "true",
    startDate: read("startDate"),
    endDate: read("endDate"),
    repeatsYearly: read("repeatsYearly") === "true",
    weekdays: formData.getAll("weekdays").map(String) as never,
    adjustmentType,
    adjustmentValue,
    appliesToAll: read("appliesToAll") !== "false",
    propertyIds: formData.getAll("propertyIds").map(String),
    unitIds: formData.getAll("unitIds").map(String),
  };
}

function revalidatePricing() {
  revalidatePath("/pricing");
  revalidatePath("/reservations/new");
  revalidatePath("/calendar/availability");
}

export async function createPricingRuleAction(
  _prev: PricingFormState,
  formData: FormData,
): Promise<PricingFormState> {
  const membership = await requireMembership();
  try {
    assertCan(membership, "pricing.create");
    await createPricingRule({
      organizationId: membership.organizationId,
      actorUserId: membership.userId,
      data: ruleFromForm(formData),
    });
  } catch (error) {
    return toFormError(error);
  }
  revalidatePricing();
  return { success: true };
}

export async function updatePricingRuleAction(
  ruleId: string,
  _prev: PricingFormState,
  formData: FormData,
): Promise<PricingFormState> {
  const membership = await requireMembership();
  try {
    assertCan(membership, "pricing.update");
    await updatePricingRule({
      organizationId: membership.organizationId,
      actorUserId: membership.userId,
      ruleId,
      data: ruleFromForm(formData),
    });
  } catch (error) {
    return toFormError(error);
  }
  revalidatePricing();
  return { success: true };
}

export async function setPricingRuleActiveAction(
  ruleId: string,
  isActive: boolean,
): Promise<PricingFormState> {
  const membership = await requireMembership();
  try {
    assertCan(membership, "pricing.update");
    await setPricingRuleActive({
      organizationId: membership.organizationId,
      actorUserId: membership.userId,
      ruleId,
      isActive,
    });
  } catch (error) {
    return toFormError(error);
  }
  revalidatePricing();
  return { success: true };
}

export async function deletePricingRuleAction(
  ruleId: string,
): Promise<PricingFormState> {
  const membership = await requireMembership();
  try {
    assertCan(membership, "pricing.delete");
    await deletePricingRule({
      organizationId: membership.organizationId,
      actorUserId: membership.userId,
      ruleId,
    });
  } catch (error) {
    return toFormError(error);
  }
  revalidatePricing();
  return { success: true };
}
