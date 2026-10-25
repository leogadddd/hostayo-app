import "server-only";

import { and, desc, eq } from "drizzle-orm";
import { listMemberships } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { organizationJoinRequests, organizations } from "@/lib/db/schema";
import type { OnboardingProfile } from "@/lib/onboarding-profile";

export type OnboardingMembership = Awaited<
  ReturnType<typeof listMemberships>
>[number];

export interface OnboardingState {
  membership: OnboardingMembership | null;
  /** The saved answers, or null before the owner has answered any. */
  profile: OnboardingProfile | null;
}

/**
 * Where a user is in onboarding, read from what already exists: an
 * organization, then the answers about the business. Properties and units are
 * no longer part of it; the dashboard checklist walks owners through those.
 */
export async function getOnboardingState(
  userId: string,
): Promise<OnboardingState> {
  const [membership] = await listMemberships(userId);
  if (!membership) return { membership: null, profile: null };
  const organization = await db.query.organizations.findFirst({
    columns: { onboardingProfile: true },
    where: eq(organizations.id, membership.organizationId),
  });
  return { membership, profile: organization?.onboardingProfile ?? null };
}

/** The first step still missing. Staff skip straight to the dashboard. */
export function nextOnboardingPath(state: OnboardingState): string {
  if (!state.membership) return "/onboarding/organization";
  if (state.membership.role !== "owner") return "/dashboard";
  if (!state.profile) return "/onboarding/operation";
  if (!state.profile.sources) return "/onboarding/workflow";
  return "/onboarding/welcome";
}

/** Redirect target for a step whose earlier steps aren't done, or null to show it. */
export function guardOnboardingStep(
  state: OnboardingState,
  step: "organization" | "operation" | "workflow",
): string | null {
  if (state.membership && state.membership.role !== "owner")
    return "/dashboard";
  if (step !== "organization" && !state.membership)
    return "/onboarding/organization";
  return null;
}

/**
 * Join requests this user sent that an owner hasn't reviewed yet. The user
 * already had each organization's code, so showing its name leaks nothing.
 */
export async function listPendingJoinRequests(userId: string) {
  return db
    .select({
      id: organizationJoinRequests.id,
      organizationName: organizations.name,
      createdAt: organizationJoinRequests.createdAt,
    })
    .from(organizationJoinRequests)
    .innerJoin(
      organizations,
      eq(organizationJoinRequests.organizationId, organizations.id),
    )
    .where(
      and(
        eq(organizationJoinRequests.userId, userId),
        eq(organizationJoinRequests.status, "pending"),
      ),
    )
    .orderBy(desc(organizationJoinRequests.updatedAt));
}
