"use client";

import { useActionState, useState } from "react";
import { toast } from "sonner";
import { Check, Copy, Link as Link2 } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/input";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import {
  createReviewLinkAction,
  type ReviewLinkState,
} from "../../reviews/actions";

/** Creates the review link for a checked-out stay. The raw token is shown once. */
export function ReviewLinkCard({ reservationId }: { reservationId: string }) {
  const [state, action, pending] = useActionState<ReviewLinkState, FormData>(
    createReviewLinkAction.bind(null, reservationId),
    {},
  );
  useActionFeedback(
    { error: state.error, success: Boolean(state.token) },
    { success: "Review link created. Copy it before leaving this page." },
  );
  const [copied, setCopied] = useState(false);
  const url = state.token
    ? `${window.location.origin}/r/${state.token}`
    : null;

  async function copyUrl() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Review link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn’t copy the review link", {
        description: "Select the link and copy it manually.",
      });
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-ink/60">
        Ask the guest how their stay was. Their review is marked as a verified
        stay. The link works for 30 days; creating a new one replaces it.
      </p>
      {url ? (
        <div className="space-y-3 rounded-xl border border-moss/40 bg-sage/35 p-4">
          <div>
            <Label htmlFor="review-link-url">Link for the guest</Label>
            <Input
              id="review-link-url"
              readOnly
              value={url}
              onFocus={(event) => event.currentTarget.select()}
              className="w-full truncate font-mono text-xs"
            />
          </div>
          <Button type="button" variant="clay" onClick={copyUrl} className="w-full">
            {copied ? (
              <Check className="h-4 w-4" aria-hidden />
            ) : (
              <Copy className="h-4 w-4" aria-hidden />
            )}
            {copied ? "Copied" : "Copy link"}
          </Button>
        </div>
      ) : (
        <form action={action}>
          <Button type="submit" variant="clay" disabled={pending}>
            <Link2 className="h-4 w-4" aria-hidden />
            {pending ? "Creating…" : "Create review link"}
          </Button>
        </form>
      )}
      <FieldError message={state.error} />
    </div>
  );
}
