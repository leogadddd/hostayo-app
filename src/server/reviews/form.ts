import type { ReviewInput } from "./service";
import { REVIEW_CATEGORIES } from "@/lib/reviews";

/** Read a review form (stars as radio values) into the service's input. */
export function reviewInputFromForm(formData: FormData): ReviewInput {
  const text = (key: string) => String(formData.get(key) ?? "");
  const categoryScores: Record<string, number> = {};
  for (const { key } of REVIEW_CATEGORIES) {
    const raw = text(`category_${key}`);
    if (raw) categoryScores[key] = Number(raw);
  }
  return {
    rating: Number(text("rating")),
    categoryScores,
    body: text("body"),
    privateFeedback: text("privateFeedback"),
    guestName: text("guestName"),
    anonymous: text("anonymous") === "true",
  };
}

/** The text fields to put back in the form after an error; React clears them on submit. */
export function reviewFormValues(formData: FormData) {
  const text = (key: string) => String(formData.get(key) ?? "");
  return {
    body: text("body"),
    privateFeedback: text("privateFeedback"),
    guestName: text("guestName"),
  };
}
