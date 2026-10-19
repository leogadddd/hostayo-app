"use client";

import { useActionState } from "react";
import { CheckCircle as CheckCircle2, Lock } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { EmptyArt } from "@/components/ui/empty-art";
import { FieldError, Input, Label, Textarea } from "@/components/ui/input";
import { StarInput } from "@/components/public/star-input";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import { REVIEW_CATEGORIES } from "@/lib/reviews";

export interface ReviewFormState {
  error?: string;
  success?: boolean;
  /** Text to restore after an error, since submitting clears the form. */
  values?: { body: string; privateFeedback: string; guestName: string };
}

const OVERALL_LABELS = [
  "Not good",
  "Could be better",
  "It was okay",
  "Really good",
  "Loved it",
] as const;

/**
 * The guest-facing review form. `verified` is the private review link for one
 * stay; `community` is the open link on a public unit page.
 */
export function ReviewForm({
  mode,
  action,
  thanks,
}: {
  mode: "verified" | "community";
  action: (
    prev: ReviewFormState,
    formData: FormData,
  ) => Promise<ReviewFormState>;
  thanks: string;
}) {
  const [state, formAction, pending] = useActionState<
    ReviewFormState,
    FormData
  >(action, {});
  useActionFeedback(state, { success: "Thank you for your review!" });

  if (state.success) {
    return (
      <div className="px-2 py-6 text-center" role="status">
        <EmptyArt name="reviews" className="mb-4" />
        <p className="flex items-center justify-center gap-2 font-display text-2xl text-pine">
          <CheckCircle2 className="h-6 w-6" aria-hidden />
          Thank you!
        </p>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink/65">
          {thanks}
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-7">
      <section aria-labelledby="overall-heading">
        <h2 id="overall-heading" className="font-display text-xl text-pine">
          How was it overall?
        </h2>
        <div className="mt-3">
          <StarInput
            name="rating"
            label="Overall rating"
            required
            size="h-10 w-10"
            labels={OVERALL_LABELS}
          />
        </div>
      </section>

      {mode === "verified" ? (
        <section
          aria-labelledby="details-heading"
          className="rounded-xl bg-pine-mist/50 p-4 sm:p-5"
        >
          <h2 id="details-heading" className="text-sm font-semibold text-pine">
            Rate the details{" "}
            <span className="font-normal text-ink/50">· optional</span>
          </h2>
          <div className="mt-2 divide-y divide-pine/10">
            {REVIEW_CATEGORIES.map((category) => (
              <div
                key={category.key}
                className="flex items-center justify-between gap-3 py-2.5"
              >
                <span className="text-sm text-ink/75">{category.label}</span>
                <StarInput
                  name={`category_${category.key}`}
                  label={`${category.label} rating`}
                  size="h-6 w-6"
                />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <Label
          htmlFor="review-body"
          className="text-base"
          info="Shown publicly on the listing."
        >
          Tell others about it
        </Label>
        <Textarea
          id="review-body"
          name="body"
          defaultValue={state.values?.body}
          maxLength={2000}
          required={mode === "community"}
          minLength={mode === "community" ? 10 : undefined}
          placeholder="What did you enjoy? What could be better?"
          className="min-h-32"
        />
      </section>

      {mode === "verified" ? (
        <section className="rounded-xl border border-clay/20 bg-clay-mist/40 p-4 sm:p-5">
          <Label
            htmlFor="review-private"
            className="flex items-center gap-1.5 text-sm font-semibold text-clay-deep"
            info="Only your host sees this. It is never shown on the listing."
          >
            <Lock className="h-4 w-4" aria-hidden />
            Private note to your host
            <span className="font-normal text-ink/50">· optional</span>
          </Label>
          <Textarea
            id="review-private"
            name="privateFeedback"
            defaultValue={state.values?.privateFeedback}
            maxLength={2000}
            placeholder="Something only your host should see, like a broken item."
            className="min-h-20 bg-surface"
          />
        </section>
      ) : (
        <section>
          <Label
            htmlFor="review-name"
            info="Shown with your review. Use a first name or nickname."
          >
            Your name
          </Label>
          <Input
            id="review-name"
            name="guestName"
            defaultValue={state.values?.guestName}
            required
            maxLength={60}
            autoComplete="given-name"
          />
        </section>
      )}

      {mode === "verified" ? (
        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink/70">
          <input
            type="checkbox"
            name="anonymous"
            value="true"
            className="h-4 w-4 accent-[var(--color-pine)]"
          />
          Show my review as &ldquo;A guest&rdquo; instead of my first name
        </label>
      ) : null}

      <div>
        <FieldError message={state.error} />
        <Button
          type="submit"
          variant="clay"
          size="lg"
          disabled={pending}
          className="w-full"
        >
          {pending ? "Sending…" : "Send review"}
        </Button>
      </div>
    </form>
  );
}
