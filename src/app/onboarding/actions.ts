"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import {
  assertOwner,
  assertNotDemoAccount,
  getDemoAccountStatus,
  PermissionError,
  requireMembership,
  requireUser,
} from "@/lib/auth/session";
import { unexpectedErrorMessage } from "@/lib/errors";
import { InventoryError } from "@/server/inventory/validation";
import {
  parseOperationAnswers,
  parseWorkflowAnswers,
} from "@/lib/onboarding-profile";
import {
  createOrganization,
  OrgError,
  saveOnboardingProfile,
  updateOrganizationName,
} from "@/server/orgs/service";
import { getOnboardingState } from "./state";

export interface OnboardingFormState {
  error?: string;
  success?: boolean;
}

function readString(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function toFormError(error: unknown): OnboardingFormState {
  if (
    error instanceof OrgError ||
    error instanceof InventoryError ||
    error instanceof PermissionError
  ) {
    return { error: error.message };
  }
  if (error instanceof ZodError) {
    return {
      error: error.issues[0]?.message ?? "Check the form and try again.",
    };
  }
  return { error: unexpectedErrorMessage(error, "onboarding") };
}

/** Step 1: create the organization from its business name, or rename it on a revisit. */
export async function saveOrganizationAction(
  _prev: OnboardingFormState,
  formData: FormData,
): Promise<OnboardingFormState> {
  const user = await requireUser();
  const name = readString(formData, "name");
  try {
    assertNotDemoAccount({
      isDemoAccount: await getDemoAccountStatus(user.id),
    });
    const { membership } = await getOnboardingState(user.id);
    if (!membership) {
      await createOrganization({ name, ownerUserId: user.id });
    } else if (
      membership.role === "owner" &&
      membership.organizationName !== name
    ) {
      await updateOrganizationName({
        organizationId: membership.organizationId,
        actorUserId: user.id,
        name,
      });
    }
  } catch (error) {
    return toFormError(error);
  }
  revalidatePath("/", "layout");
  return { success: true };
}

/** Step 2: how big the business is. */
export async function saveOperationAction(
  _prev: OnboardingFormState,
  formData: FormData,
): Promise<OnboardingFormState> {
  const membership = await requireMembership();
  try {
    assertOwner(membership);
    await saveOnboardingProfile({
      organizationId: membership.organizationId,
      answers: parseOperationAnswers({
        unitCount: formData.get("unitCount"),
        monthlyBookings: formData.get("monthlyBookings"),
      }),
    });
  } catch (error) {
    return toFormError(error);
  }
  return { success: true };
}

/** Step 3: where bookings come from and how the business runs today. */
export async function saveWorkflowAction(
  _prev: OnboardingFormState,
  formData: FormData,
): Promise<OnboardingFormState> {
  const membership = await requireMembership();
  try {
    assertOwner(membership);
    await saveOnboardingProfile({
      organizationId: membership.organizationId,
      answers: parseWorkflowAnswers({
        sources: formData.getAll("sources"),
        teamSize: formData.get("teamSize"),
        currentTool: formData.get("currentTool"),
      }),
    });
  } catch (error) {
    return toFormError(error);
  }
  revalidatePath("/dashboard");
  return { success: true };
}
