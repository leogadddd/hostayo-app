"use client";

import { useActionState, useState } from "react";
import { ShieldCheck } from "@/components/ui/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, Textarea } from "@/components/ui/input";
import { Stars } from "@/components/public/stars";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import {
  matchReviewAction,
  replyToReviewAction,
  setReviewStatusAction,
  type ReviewActionState,
} from "./actions";

export interface ReviewCardData {
  id: string;
  kind: "verified" | "community";
  status: "pending" | "published" | "hidden";
  rating: number;
  body: string;
  privateFeedback: string | null;
  guestName: string;
  unitName: string;
  propertyName: string;
  submittedAt: string;
  hostReply: string | null;
  matchable: { reservationId: string; label: string }[];
}

function StatusButton({
  reviewId,
  status,
  label,
  variant,
}: {
  reviewId: string;
  status: "published" | "hidden";
  label: string;
  variant: "primary" | "outline";
}) {
  const [state, action, pending] = useActionState<ReviewActionState, FormData>(
    setReviewStatusAction.bind(null, reviewId, status),
    {},
  );
  useActionFeedback(state, {
    success: status === "hidden" ? "Review hidden." : "Review published.",
  });
  return (
    <form action={action}>
      <Button type="submit" size="sm" variant={variant} disabled={pending}>
        {label}
      </Button>
    </form>
  );
}

function ReplyForm({
  reviewId,
  initial,
  onDone,
}: {
  reviewId: string;
  initial: string;
  onDone: () => void;
}) {
  const [state, action, pending] = useActionState<ReviewActionState, FormData>(
    async (prev, formData) => {
      const result = await replyToReviewAction(reviewId, prev, formData);
      if (result.success) onDone();
      return result;
    },
    {},
  );
  useActionFeedback(state, { success: "Reply posted." });
  return (
    <form action={action} className="mt-3 space-y-2">
      <Textarea
        name="reply"
        defaultValue={initial}
        maxLength={1000}
        required
        aria-label="Your public reply"
        placeholder="Thank them, or address what they raised. Replies are public."
        className="min-h-20"
      />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Posting…" : "Post reply"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function MatchForm({
  reviewId,
  options,
}: {
  reviewId: string;
  options: { reservationId: string; label: string }[];
}) {
  const [state, action, pending] = useActionState<ReviewActionState, FormData>(
    matchReviewAction.bind(null, reviewId),
    {},
  );
  useActionFeedback(state, { success: "Matched to the stay and verified." });
  if (options.length === 0) return null;
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <Select
        name="reservationId"
        required
        aria-label="Match to a stay"
        defaultValue=""
        className="w-auto max-w-full"
      >
        <option value="" disabled>
          Match to a stay…
        </option>
        {options.map((option) => (
          <option key={option.reservationId} value={option.reservationId}>
            {option.label}
          </option>
        ))}
      </Select>
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        Verify
      </Button>
    </form>
  );
}

export function ReviewCard({
  review,
  canUpdate,
}: {
  review: ReviewCardData;
  canUpdate: boolean;
}) {
  const [replying, setReplying] = useState(false);
  const submitted = new Date(review.submittedAt).toLocaleDateString("en-PH", {
    dateStyle: "medium",
    timeZone: "Asia/Manila",
  });
  return (
    <article className="space-y-3 px-5 py-5">
      <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-semibold text-pine">{review.guestName}</span>
            <Stars value={review.rating} />
          </div>
          <p className="mt-0.5 text-xs text-ink/55">
            {review.unitName} · {review.propertyName}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {review.status === "pending" ? (
            <Badge tone="clay">Needs approval</Badge>
          ) : null}
          {review.status === "hidden" ? (
            <Badge tone="clay">Hidden</Badge>
          ) : null}
          {review.kind === "verified" ? (
            <Badge tone="sage">
              <ShieldCheck weight="fill" className="h-3 w-3" aria-hidden />
              Verified stay
            </Badge>
          ) : (
            <Badge>Open link</Badge>
          )}
          <time className="text-xs text-ink/55" dateTime={review.submittedAt}>
            {submitted}
          </time>
        </div>
      </header>
      {review.body ? (
        <p className="whitespace-pre-line text-sm leading-relaxed text-ink/80">
          {review.body}
        </p>
      ) : (
        <p className="text-sm italic text-ink/50">No written review.</p>
      )}
      {review.privateFeedback ? (
        <div className="rounded-lg bg-clay-mist p-3 text-sm">
          <p className="font-medium text-clay-deep">
            Private note (only you can see this)
          </p>
          <p className="mt-1 whitespace-pre-line text-ink/80">
            {review.privateFeedback}
          </p>
        </div>
      ) : null}
      {review.hostReply && !replying ? (
        <div className="rounded-lg bg-sage/40 p-3 text-sm">
          <p className="font-medium text-pine">Your public reply</p>
          <p className="mt-1 whitespace-pre-line text-ink/75">
            {review.hostReply}
          </p>
        </div>
      ) : null}

      {canUpdate ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-pine/10 pt-3">
          {review.status === "pending" ? (
            <>
              <StatusButton
                reviewId={review.id}
                status="published"
                label="Publish"
                variant="primary"
              />
              <MatchForm reviewId={review.id} options={review.matchable} />
            </>
          ) : null}
          {review.status !== "pending" && !replying ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setReplying(true)}
            >
              {review.hostReply ? "Edit reply" : "Reply"}
            </Button>
          ) : null}
          {review.status === "hidden" ? (
            <StatusButton
              reviewId={review.id}
              status="published"
              label="Show again"
              variant="outline"
            />
          ) : (
            <StatusButton
              reviewId={review.id}
              status="hidden"
              label="Hide"
              variant="outline"
            />
          )}
        </div>
      ) : null}
      {replying ? (
        <ReplyForm
          reviewId={review.id}
          initial={review.hostReply ?? ""}
          onDone={() => setReplying(false)}
        />
      ) : null}
    </article>
  );
}
