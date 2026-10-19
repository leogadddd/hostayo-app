"use server";

import { revalidatePath } from "next/cache";
import {
  assertCan,
  PermissionError,
  requireMembership,
} from "@/lib/auth/session";
import { unexpectedErrorMessage } from "@/lib/errors";
import {
  createReviewLink,
  matchCommunityReview,
  replyToReview,
  ReviewError,
  setReviewStatus,
} from "@/server/reviews/service";

export interface ReviewActionState {
  error?: string;
  success?: boolean;
}

function toState(error: unknown): ReviewActionState {
  if (error instanceof ReviewError || error instanceof PermissionError) {
    return { error: error.message };
  }
  return { error: unexpectedErrorMessage(error, "reviews") };
}

export async function replyToReviewAction(
  reviewId: string,
  _prev: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  try {
    const membership = await requireMembership();
    assertCan(membership, "reviews.update");
    await replyToReview({
      organizationId: membership.organizationId,
      actorUserId: membership.userId,
      reviewId,
      reply: String(formData.get("reply") ?? ""),
    });
  } catch (error) {
    return toState(error);
  }
  revalidatePath("/reviews");
  return { success: true };
}

export async function setReviewStatusAction(
  reviewId: string,
  status: "published" | "hidden",
  _prev: ReviewActionState,
  _formData: FormData,
): Promise<ReviewActionState> {
  void _formData;
  try {
    const membership = await requireMembership();
    assertCan(membership, "reviews.update");
    await setReviewStatus({
      organizationId: membership.organizationId,
      actorUserId: membership.userId,
      reviewId,
      status,
    });
  } catch (error) {
    return toState(error);
  }
  revalidatePath("/reviews");
  return { success: true };
}

export async function matchReviewAction(
  reviewId: string,
  _prev: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  try {
    const membership = await requireMembership();
    assertCan(membership, "reviews.update");
    await matchCommunityReview({
      organizationId: membership.organizationId,
      actorUserId: membership.userId,
      reviewId,
      reservationId: String(formData.get("reservationId") ?? ""),
    });
  } catch (error) {
    return toState(error);
  }
  revalidatePath("/reviews");
  return { success: true };
}

export interface ReviewLinkState {
  error?: string;
  token?: string;
}

export async function createReviewLinkAction(
  reservationId: string,
  _prev: ReviewLinkState,
  _formData: FormData,
): Promise<ReviewLinkState> {
  void _formData;
  try {
    const membership = await requireMembership();
    // Sharing guest links is a guest-profile permission everywhere else too.
    assertCan(membership, "guests.update");
    const link = await createReviewLink({
      organizationId: membership.organizationId,
      actorUserId: membership.userId,
      reservationId,
    });
    return { token: link.token };
  } catch (error) {
    return toState(error);
  }
}
