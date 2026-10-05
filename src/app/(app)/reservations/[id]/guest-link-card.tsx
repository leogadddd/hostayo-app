"use client";

import { startTransition, useActionState, useState } from "react";
import { Check, Copy, Link2, Share2, ShieldX } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { FieldError, Input, Label } from "@/components/ui/input";
import {
  createGuestLinkAction,
  revokeGuestLinkAction,
  type GuestLinkFormState,
} from "../actions";
import { useActionFeedback } from "@/hooks/use-action-feedback";

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

/**
 * The raw token is a secret that exists only in client state immediately
 * after creation; the database stores only its hash.
 */
export function GuestLinkCard({
  reservationId,
  activeToken,
}: {
  reservationId: string;
  activeToken: { id: string; createdAt: Date; expiresAt: Date } | null;
}) {
  const [created, createAction, createPending] = useActionState<
    GuestLinkFormState,
    FormData
  >(createGuestLinkAction.bind(null, reservationId), {});
  const [revokeState, revokeAction, revokePending] = useActionState<
    GuestLinkFormState,
    FormData
  >(revokeGuestLinkAction.bind(null, reservationId, activeToken?.id ?? ""), {});
  useActionFeedback(created, {
    success: "Welcome link created. Copy or share it before leaving this page.",
  });
  useActionFeedback(revokeState, { success: "Welcome link revoked." });

  const [copied, setCopied] = useState(false);
  const shownToken = created.token ?? null;
  const url = shownToken ? `${window.location.origin}/g/${shownToken}` : null;

  async function copyUrl() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Welcome link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn’t copy the welcome link", {
        description: "Select the link above and copy it manually.",
      });
    }
  }

  async function shareUrl() {
    if (!url) return;
    if (!navigator.share) {
      await copyUrl();
      return;
    }
    try {
      await navigator.share({
        title: "Your Hostayo stay",
        text: "Here are the details for your stay.",
        url,
      });
    } catch (error) {
      // Closing the platform share sheet is not an error the host needs to see.
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error(
        "Couldn’t open sharing options. Try copying the link instead.",
      );
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-ink/60">
        A private welcome-page link for the guest, with their stay details,
        booking status and payment information.
      </p>

      {url ? (
        <div className="space-y-3 rounded-xl border border-moss/40 bg-sage/35 p-4">
          <div>
            <Label htmlFor="guest-link-url">Link for the guest</Label>
            <p className="-mt-1 mb-2 text-xs leading-relaxed text-ink/55">
              Shown only once. Copy or share it before leaving this page.
            </p>
            <Input
              id="guest-link-url"
              readOnly
              value={url}
              onFocus={(event) => event.currentTarget.select()}
              className="w-full truncate font-mono text-xs"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="clay"
              onClick={copyUrl}
              className="w-full whitespace-nowrap"
            >
              {copied ? (
                <Check className="h-4 w-4" aria-hidden />
              ) : (
                <Copy className="h-4 w-4" aria-hidden />
              )}
              {copied ? "Copied" : "Copy link"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void shareUrl()}
              className="w-full whitespace-nowrap"
            >
              <Share2 className="h-4 w-4" aria-hidden />
              Share
            </Button>
          </div>
          <span className="sr-only" role="status">
            {copied ? "Welcome link copied" : ""}
          </span>
        </div>
      ) : null}

      {activeToken && !url ? (
        <div className="space-y-3 rounded-xl border border-pine/10 bg-pine-mist/40 p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-pine">
              Link is active
            </span>
            <span className="rounded-full bg-sage px-2.5 py-0.5 text-xs font-medium text-pine">
              Active
            </span>
          </div>
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-ink/55">Created</dt>
              <dd className="text-right text-ink/80">
                {formatDateTime(activeToken.createdAt)}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink/55">Expires</dt>
              <dd className="text-right text-ink/80">
                {formatDateTime(activeToken.expiresAt)}
              </dd>
            </div>
          </dl>
          {/* <p className="text-xs leading-relaxed text-ink/50">For security, the original link can’t be shown again. Create a replacement to get a new one.</p> */}
          <div className="grid grid-cols-2 gap-2">
            <ConfirmationDialog
              trigger={
                <>
                  <Link2 className="h-4 w-4" aria-hidden />
                  {createPending ? "Creating…" : "Replace link"}
                </>
              }
              triggerVariant="clay"
              triggerClassName="w-full whitespace-nowrap"
              title="Replace this welcome link?"
              description="The current link stops working right away. Anyone who has it, including the guest, will need the new link you create next."
              confirmLabel="Replace link"
              successMessage={null}
              onConfirm={() =>
                startTransition(() => createAction(new FormData()))
              }
            />
            <ConfirmationDialog
              trigger={
                <>
                  <ShieldX className="h-4 w-4" aria-hidden />
                  {revokePending ? "Revoking…" : "Revoke"}
                </>
              }
              triggerVariant="outline"
              triggerClassName="w-full whitespace-nowrap text-clay-deep hover:bg-clay-mist/70"
              title="Revoke this welcome link?"
              description="The guest will no longer be able to open their welcome page with this link. You can create a new link at any time."
              confirmLabel="Revoke link"
              successMessage={null}
              onConfirm={() =>
                startTransition(() => revokeAction(new FormData()))
              }
            />
          </div>
          {/* <p className="text-xs leading-relaxed text-ink/50">Replacing or revoking disables the current link immediately.</p> */}
        </div>
      ) : null}

      {!url && !activeToken ? (
        <form action={createAction}>
          <Button
            type="submit"
            variant="clay"
            size="md"
            disabled={createPending}
          >
            <Link2 className="h-4 w-4" aria-hidden />
            {createPending ? "Creating link…" : "Create welcome link"}
          </Button>
        </form>
      ) : null}

      <FieldError message={created.error ?? revokeState.error} />
    </div>
  );
}
