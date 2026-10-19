"use server";

import { unexpectedErrorMessage } from "@/lib/errors";
import type { ReviewFormState } from "@/components/public/review-form";
import { reviewFormValues, reviewInputFromForm } from "@/server/reviews/form";
import { ReviewError, submitVerifiedReview } from "@/server/reviews/service";

export async function submitVerifiedReviewAction(
  token: string,
  _prev: ReviewFormState,
  formData: FormData,
): Promise<ReviewFormState> {
  try {
    await submitVerifiedReview({ token, data: reviewInputFromForm(formData) });
  } catch (error) {
    const values = reviewFormValues(formData);
    if (error instanceof ReviewError) return { error: error.message, values };
    return { error: unexpectedErrorMessage(error, "review"), values };
  }
  return { success: true };
}
