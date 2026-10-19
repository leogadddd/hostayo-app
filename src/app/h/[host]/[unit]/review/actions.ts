"use server";

import { headers } from "next/headers";
import { unexpectedErrorMessage } from "@/lib/errors";
import type { ReviewFormState } from "@/components/public/review-form";
import { reviewFormValues, reviewInputFromForm } from "@/server/reviews/form";
import {
  ReviewError,
  reviewerFingerprint,
  submitCommunityReview,
} from "@/server/reviews/service";

export async function submitCommunityReviewAction(
  hostSlug: string,
  unitSlug: string,
  _prev: ReviewFormState,
  formData: FormData,
): Promise<ReviewFormState> {
  const requestHeaders = await headers();
  const ip =
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    requestHeaders.get("x-real-ip") ??
    "unknown";
  const fingerprint = reviewerFingerprint(
    ip,
    requestHeaders.get("user-agent") ?? "",
  );
  try {
    await submitCommunityReview({
      hostSlug,
      unitSlug,
      fingerprint,
      data: reviewInputFromForm(formData),
    });
  } catch (error) {
    const values = reviewFormValues(formData);
    if (error instanceof ReviewError) return { error: error.message, values };
    return { error: unexpectedErrorMessage(error, "review"), values };
  }
  return { success: true };
}
