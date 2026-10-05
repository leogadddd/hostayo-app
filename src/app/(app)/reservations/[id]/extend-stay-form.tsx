"use client";

import { useActionState, useState } from "react";
import { CircleCheck, Clock, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldError, Label, Textarea } from "@/components/ui/input";
import { formatPHP } from "@/lib/money";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import {
  requestExtensionAction,
  type ExtensionFormState,
} from "./extension-actions";
import { useReservationSaved } from "./use-reservation-saved";

const HOUR_MS = 3_600_000;

/** Logs the guest's late check-out request. Nothing changes until it's approved. */
export function ExtendStayForm({
  reservationId,
  availableHours,
  departureAt,
  hourlyRateCents,
  showMoney,
  timeZone,
  limitNote,
}: {
  reservationId: string;
  availableHours: number;
  /** Current departure (ISO), with any approved extensions. */
  departureAt: string;
  /** The rate the request is quoted at. */
  hourlyRateCents: number;
  showMoney: boolean;
  timeZone: string;
  /** What caps the hours, e.g. "Next guest arrives 3:00 PM; turnover takes 2h". */
  limitNote: string;
}) {
  const save = useReservationSaved(
    requestExtensionAction.bind(null, reservationId),
    reservationId,
    "Late check-out requested.",
  );
  const [state, formAction, pending] = useActionState<
    ExtensionFormState,
    FormData
  >(save, {});
  useActionFeedback(state);

  const [hours, setHours] = useState(1);
  const time = new Intl.DateTimeFormat("en-PH", {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  });
  const current = new Date(departureAt);
  const until = new Date(current.getTime() + hours * HOUR_MS);

  return (
    <form action={formAction} className="space-y-6">
      <div className="flex items-center gap-3 rounded-xl bg-linen p-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sage/60 text-pine">
          <Clock className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-ink/45">
            Check-out now
          </p>
          <p className="font-display text-xl text-pine">
            {time.format(current)}
          </p>
          <p className="text-xs text-ink/55">{limitNote}</p>
        </div>
      </div>

      <div>
        <Label htmlFor="extend-hours">
          Extra hours the guest is asking for
        </Label>
        <input type="hidden" name="hours" value={hours} />
        <div className="flex max-w-56 items-center rounded-xl border border-pine/20 bg-surface">
          <button
            type="button"
            aria-label="Fewer hours"
            onClick={() => setHours(Math.max(1, hours - 1))}
            disabled={hours <= 1}
            className="flex h-12 w-12 items-center justify-center rounded-l-xl text-pine hover:bg-pine-mist/60 disabled:opacity-35"
          >
            <Minus className="h-4 w-4" aria-hidden />
          </button>
          <span
            id="extend-hours"
            className="flex-1 text-center text-sm font-medium tabular-nums text-ink"
          >
            {hours} hour{hours === 1 ? "" : "s"}
          </span>
          <button
            type="button"
            aria-label="More hours"
            onClick={() => setHours(Math.min(availableHours, hours + 1))}
            disabled={hours >= availableHours}
            className="flex h-12 w-12 items-center justify-center rounded-r-xl text-pine hover:bg-pine-mist/60 disabled:opacity-35"
          >
            <Plus className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>

      {/* The system check, before anyone approves it. */}
      <p
        role="status"
        className="flex items-start gap-2 rounded-xl border border-l-4 border-sage border-l-pine bg-sage/30 px-4 py-3 text-sm text-pine-deep"
      >
        <CircleCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <span>
          Fits: the guest would leave by{" "}
          <span className="font-medium">{time.format(until)}</span>, with
          turnover done before the unit is needed.
          {showMoney ? (
            <>
              {" "}
              Estimated {formatPHP(hours * hourlyRateCents)} (
              {formatPHP(hourlyRateCents)}/h).
            </>
          ) : null}
        </span>
      </p>

      <div>
        <Label htmlFor="extend-note">
          Note <span className="font-normal text-ink/45">(optional)</span>
        </Label>
        <Textarea
          id="extend-note"
          name="note"
          maxLength={300}
          placeholder="e.g. Asked at the front desk; flight leaves at 6 PM."
          className="min-h-16"
        />
      </div>

      <p className="text-xs text-ink/55">
        This sends a request. The check-out time and charges change only once
        someone approves it.
      </p>
      <FieldError message={state.error} />
      <Button
        type="submit"
        variant="clay"
        size="lg"
        disabled={pending}
        className="w-full"
      >
        {pending
          ? "Sending…"
          : `Request late check-out until ${time.format(until)}`}
      </Button>
    </form>
  );
}
