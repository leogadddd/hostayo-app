"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { SharePublicLink } from "@/components/app/share-public-link";
import { useConnection } from "@/lib/offline/connectivity";
import { cn } from "@/lib/utils";
import { setPublicPageLiveAction } from "../actions";

/** Go-live switch for the public showcase page. Saves as soon as it flips. */
export function GoLiveCard({
  slug,
  initialLive,
  remaining,
}: {
  slug: string;
  initialLive: boolean;
  /** Checklist steps before "Go live" that aren't done yet. */
  remaining: number;
}) {
  const [confirming, setConfirming] = useState(false);
  const [live, setLive] = useState(initialLive);
  const [pending, startTransition] = useTransition();
  const href = `/h/${encodeURIComponent(slug)}`;

  function toggle() {
    setConfirming(false);
    const next = !live;
    setLive(next);
    startTransition(async () => {
      const result = await setPublicPageLiveAction(next);
      if (result.error) {
        setLive(!next);
        toast.error(result.error);
        return;
      }
      toast.success(
        next ? "Your public page is live" : "Your public page is paused",
      );
    });
  }

  // Guests only see the page once the server says so, so this needs a connection.
  const { online } = useConnection();
  function askToConfirm() {
    if (!online) {
      toast.error("You’re offline", {
        description: "Connect to the internet to change your public page.",
      });
      return;
    }
    setConfirming(true);
  }

  return (
    <Card className="bg-card">
      <CardHeader className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-xl text-pine">
            Go live
            <Badge tone={live ? "sage" : "neutral"}>
              {live ? "Live" : "Paused"}
            </Badge>
          </h2>
          <p className="mt-1 max-w-xl text-sm text-ink/60">
            Turn this on to show your public page and unit pages to guests and
            search engines. While it’s off, those links show “not found”. Your
            guests’ private booking links keep working either way.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={live}
          aria-label="Public page is live"
          disabled={pending}
          onClick={askToConfirm}
          className={cn(
            "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:opacity-60",
            live ? "bg-primary" : "bg-pine/20",
          )}
        >
          <span
            className={cn(
              "inline-block h-5 w-5 rounded-full bg-white shadow transition-transform",
              live ? "translate-x-[1.375rem]" : "translate-x-0.5",
            )}
          />
        </button>
      </CardHeader>
      {live ? (
        <CardBody className="flex flex-wrap items-center justify-between gap-3">
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="break-all text-sm text-pine underline-offset-2 hover:underline"
          >
            {href}
          </a>
          <SharePublicLink href={href} title="public page" size="sm" />
        </CardBody>
      ) : null}
      <ConfirmDialog
        open={confirming}
        title={live ? "Pause your public page?" : "Go live?"}
        description={
          live
            ? "Your public page and unit pages will show “not found” to guests and search engines until you go live again. Your team can keep working as usual."
            : remaining > 0
              ? `Your setup checklist still has ${remaining} ${remaining === 1 ? "step" : "steps"} left. Guests will see your public page as it is now, so it may look unfinished.`
              : "Your public page and unit pages will be visible to guests and search engines."
        }
        confirmLabel={live ? "Pause page" : "Go live"}
        cancelLabel="Cancel"
        onConfirm={toggle}
        onClose={() => setConfirming(false)}
      />
    </Card>
  );
}
