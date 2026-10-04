"use client";

import { useActionState, useState } from "react";
import { CircleAlert, CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label, Textarea } from "@/components/ui/input";
import { centavosToPesosInput, formatPHP, pesosToCentavos } from "@/lib/money";
import { cn } from "@/lib/utils";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import { approveExtensionAction, declineExtensionAction, type ExtensionFormState } from "./extension-actions";
import { useReservationSaved } from "./use-reservation-saved";

/** Empty means the quoted rate; 0 is allowed for a free late check-out. */
function parseRate(input: string, fallback: number): number | null {
  if (!input.trim()) return fallback;
  try {
    return pesosToCentavos(input, { allowZero: true });
  } catch {
    return null;
  }
}

/**
 * Approve or decline a late check-out request. `blockedReason` is the
 * system's re-check against the next arrival right now; approval is only
 * offered when it still fits.
 */
export function ReviewExtensionForm({
  reservationId,
  extensionId,
  hours,
  untilLabel,
  quotedRateCents,
  canSetRate,
  showMoney,
  blockedReason,
  fitNote,
}: {
  reservationId: string;
  extensionId: string;
  hours: number;
  untilLabel: string;
  quotedRateCents: number;
  canSetRate: boolean;
  showMoney: boolean;
  blockedReason: string | null;
  /** What the check found when it fits, e.g. "Next guest arrives 3:00 PM; turnover takes 2h." */
  fitNote: string;
}) {
  const approve = useReservationSaved(approveExtensionAction.bind(null, reservationId, extensionId), reservationId, "Late check-out approved.");
  const decline = useReservationSaved(declineExtensionAction.bind(null, reservationId, extensionId), reservationId, "Request declined.");
  const [approveState, approveAction, approving] = useActionState<ExtensionFormState, FormData>(approve, {});
  const [declineState, declineAction, declining] = useActionState<ExtensionFormState, FormData>(decline, {});
  useActionFeedback(approveState);
  useActionFeedback(declineState);

  const [rateInput, setRateInput] = useState(centavosToPesosInput(quotedRateCents));
  const rateCents = canSetRate ? parseRate(rateInput, quotedRateCents) : quotedRateCents;

  return (
    <div className="space-y-6">
      <p role="status" className={cn(
        "flex items-start gap-2 rounded-xl border border-l-4 px-4 py-3 text-sm",
        blockedReason ? "border-clay/25 border-l-clay bg-clay-mist/60 text-clay-deep" : "border-sage border-l-pine bg-sage/30 text-pine-deep",
      )}>
        {blockedReason ? <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> : <CircleCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />}
        <span>{blockedReason ?? `Still fits: +${hours}h, leaving by ${untilLabel}. ${fitNote}`}</span>
      </p>

      {blockedReason ? null : (
        <form action={approveAction} className="space-y-4 rounded-xl border border-pine/10 p-4">
          <h3 className="font-medium text-pine">Approve</h3>
          {canSetRate ? (
            <div className="max-w-56">
              <Label htmlFor="approve-rate">Hourly rate (₱)</Label>
              <Input id="approve-rate" name="hourlyRatePesos" inputMode="decimal" value={rateInput} onChange={(event) => setRateInput(event.target.value)} aria-invalid={rateCents === null} />
              <p className="mt-1 text-xs text-ink/55">Quoted at {formatPHP(quotedRateCents)}/h when requested.</p>
            </div>
          ) : null}
          <div>
            <Label htmlFor="approve-note">Note <span className="font-normal text-ink/45">(optional)</span></Label>
            <Textarea id="approve-note" name="note" maxLength={300} className="min-h-14" />
          </div>
          <FieldError message={rateCents === null ? "Enter the hourly rate like 250 or 250.50." : approveState.error} />
          <Button type="submit" variant="clay" size="lg" disabled={approving || declining || rateCents === null} className="w-full">
            {approving ? "Approving…" : `Approve until ${untilLabel}${showMoney && rateCents !== null ? ` · ${formatPHP(hours * rateCents)}` : ""}`}
          </Button>
        </form>
      )}

      <form action={declineAction} className="space-y-4 rounded-xl border border-pine/10 p-4">
        <h3 className="font-medium text-pine">Decline</h3>
        <div>
          <Label htmlFor="decline-note">Reason</Label>
          <Textarea id="decline-note" name="note" required minLength={2} maxLength={300} placeholder="e.g. Next guest is arriving early." className="min-h-14" />
        </div>
        <FieldError message={declineState.error} />
        <Button type="submit" variant="outline" size="lg" disabled={approving || declining} className="w-full">
          {declining ? "Declining…" : "Decline request"}
        </Button>
      </form>
    </div>
  );
}
