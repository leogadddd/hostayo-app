"use client";

import { useActionState } from "react";
import { useState } from "react";
import { Check, Copy, Link2, ShieldX } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
 * Guest booking-status link. The raw token exists only in the client state
 * right after creation — it is never persisted or re-shown.
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
  useActionFeedback(created, { success: "Welcome link created. Copy it before leaving this page." });
  useActionFeedback(revokeState, { success: "Welcome link revoked." });

  const [copied, setCopied] = useState(false);
  const shownToken = created.token ?? null;
  const url = shownToken ? `${window.location.origin}/g/${shownToken}/stay` : null;

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

  return (
    <div className="space-y-3">
      <p className="text-sm text-ink/60">
        A private welcome-page link for the guest. It includes stay details and
        links through to their booking status and balance. Creating a new link
        disables the old one.
      </p>

      {url ? (
        <div className="space-y-3 rounded-xl border border-moss/40 bg-sage/35 p-4">
          <div>
            <Label htmlFor="guest-link-url">Welcome link</Label>
            <p className="-mt-1 mb-2 text-xs text-ink/55">Shown once. Copy it now and send it to your guest.</p>
            <Input id="guest-link-url" readOnly value={url} onFocus={(event) => event.currentTarget.select()} className="w-full font-mono text-xs" />
          </div>
          <Button type="button" variant="clay" size="lg" onClick={copyUrl} className="w-full sm:w-auto">
            {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
            {copied ? "Welcome link copied" : "Copy welcome link"}
          </Button>
          <span className="sr-only" role="status">{copied ? "Welcome link copied" : ""}</span>
        </div>
      ) : null}

      {activeToken ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-pine/10 p-3">
          <p className="text-sm text-ink/70">
            Welcome link created {formatDateTime(activeToken.createdAt)} · expires{" "}
            {formatDateTime(activeToken.expiresAt)}
          </p>
          <form action={revokeAction}>
            <Button type="submit" variant="ghost" size="sm" disabled={revokePending} className="text-clay-deep hover:bg-clay-mist/70">
              <ShieldX className="h-4 w-4" aria-hidden />
              {revokePending ? "Revoking…" : "Revoke link"}
            </Button>
          </form>
        </div>
      ) : (
        <form action={createAction}>
          <Button type="submit" variant={url ? "outline" : "clay"} size="md" disabled={createPending}>
            <Link2 className="h-4 w-4" aria-hidden />
            {createPending
              ? "Creating link…"
              : url
                ? "Create another welcome link"
                : "Create welcome link"}
          </Button>
        </form>
      )}

      <FieldError message={created.error ?? revokeState.error} />
    </div>
  );
}
