"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CaretUp,
  Check,
  WarningCircle as CircleAlert,
  CircleNotch as LoaderCircle,
} from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { StepProgress } from "@/components/ui/step-progress";
import { formatPHP } from "@/lib/money";
import { cn } from "@/lib/utils";
import { dayLabel } from "../../calendar/availability/stay-display";
import { MobileChargesStep } from "./mobile-charges-step";
import { MobileGuestsStep } from "./mobile-guests-step";
import { MobileReviewStep } from "./mobile-review-step";
import { MobileStayStep } from "./mobile-stay-step";
import { STEP_LABELS, type ReservationDraft } from "./reservation-draft";
import { SaveNowButton } from "./reservation-form-parts";
import { ReservationSummary } from "./reservation-summary";
import { StayRangeCalendar } from "./stay-range-calendar";

/**
 * The reservation flow drawn for a phone: one soft card per idea, pickers and
 * editors in drawers, and the way forward pinned above the tab bar. It uses
 * the same draft as the desktop wizard, so the rules never differ.
 */
export function MobileReservationForm({ draft }: { draft: ReservationDraft }) {
  const {
    units,
    edit,
    step,
    steps,
    stepIndex,
    firstBlocked,
    stepIssues,
    showIssue,
    goTo,
    next,
    submit,
    saveNow,
    pending,
    savingLabel,
    submitMode,
    selectedUnit,
    checkIn,
    checkOut,
    nights,
    guestCount,
    contact,
    selectedGuest,
    submittableLines,
    totals,
    paymentCents,
    payment,
    canSetCharges,
    today,
    setCheckIn,
    setCheckOut,
    validRange,
  } = draft;
  const [sheet, setSheet] = useState<"dates" | "summary" | null>(null);

  if (units.length === 0) {
    return (
      <div className="rounded-3xl bg-surface p-5 text-sm text-ink/70 ring-1 ring-pine/10">
        No units are accepting bookings yet. Activate a unit first, then come
        back to place a hold or booking.
      </div>
    );
  }

  const stepItems = steps.map((id, index) => ({
    key: id,
    label: STEP_LABELS[id],
    done: !edit && index < stepIndex,
    disabled: !edit && firstBlocked !== -1 && index > firstBlocked,
    onSelect: () => {
      if (id !== step) goTo(id);
    },
  }));
  const guestLabel = (edit ? contact.name.trim() : selectedGuest?.name) || null;
  const issue = showIssue ? stepIssues[step] : null;
  const summaryText = [
    selectedUnit?.name,
    validRange ? `${dayLabel(checkIn)} → ${dayLabel(checkOut)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="min-w-0 space-y-3">
      <StepProgress
        label="Reservation steps"
        current={step}
        items={stepItems}
      />

      {step === "stay" ? (
        <MobileStayStep draft={draft} onPickDates={() => setSheet("dates")} />
      ) : null}
      {step === "guests" ? <MobileGuestsStep draft={draft} /> : null}
      {step === "charges" && canSetCharges ? (
        <MobileChargesStep draft={draft} />
      ) : null}
      {step === "review" ? <MobileReviewStep draft={draft} /> : null}

      {issue ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-2xl bg-clay-mist px-4 py-3 text-sm text-clay-deep"
        >
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {issue}
        </p>
      ) : null}
      {edit && step !== "review" ? (
        <p className="sr-only" aria-live="polite">
          {draft.state.error ?? ""}
        </p>
      ) : null}
      {edit && (draft.reviewError ?? draft.state.error) ? (
        <p
          role="alert"
          className="rounded-2xl bg-clay-mist px-4 py-3 text-sm text-clay-deep"
        >
          {draft.reviewError ?? draft.state.error}
        </p>
      ) : null}

      {/* Pinned flush above the tab bar. The scroll area is padded, and a sticky box
          sticks inside that padding, so the offset cancels it out. */}
      <div className="sticky -bottom-5 z-10 -mx-4 -mb-5 sm:-bottom-6 sm:-mb-6 border-t border-pine/10 bg-paper/95 px-4 pb-3 pt-2.5 shadow-[0_-8px_24px_rgba(32,58,53,0.08)] backdrop-blur sm:-mx-6 sm:px-6">
        <button
          type="button"
          onClick={() => setSheet("summary")}
          aria-haspopup="dialog"
          className="mb-2.5 flex w-full items-center justify-between gap-3 rounded-2xl bg-surface px-3.5 py-2.5 text-left ring-1 ring-pine/10 active:bg-pine-mist"
        >
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-pine">
              {summaryText || "Your booking"}
            </span>
            <span className="block text-xs text-ink/55">
              Tap for the summary
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            {canSetCharges ? (
              <span className="text-base font-semibold tabular-nums text-pine">
                {formatPHP(totals.bookingTotalCents)}
              </span>
            ) : null}
            <CaretUp className="h-4 w-4 text-ink/45" aria-hidden />
          </span>
        </button>
        <div className="flex items-center gap-3">
          {edit ? (
            <>
              <Link
                href={`/reservations/${edit.reservationId}`}
                className="inline-flex h-12 items-center justify-center rounded-2xl px-5 text-sm font-semibold text-pine active:bg-pine-mist"
              >
                Cancel
              </Link>
              <SaveNowButton
                pending={pending}
                savingLabel={savingLabel}
                blocked={firstBlocked !== -1}
                onSave={saveNow}
              />
            </>
          ) : (
            <>
              {stepIndex === 0 ? (
                <Link
                  href="/reservations"
                  className="inline-flex h-12 items-center justify-center rounded-2xl px-5 text-sm font-semibold text-pine active:bg-pine-mist"
                >
                  Cancel
                </Link>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 rounded-2xl"
                  onClick={() => goTo(steps[stepIndex - 1]!, true)}
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden />
                  Back
                </Button>
              )}
              {step === "review" ? (
                <Button
                  type="button"
                  variant="clay"
                  className={cn("h-12 flex-1 rounded-2xl text-base")}
                  onClick={submit}
                  disabled={pending}
                >
                  {pending ? (
                    <LoaderCircle
                      className="h-4 w-4 animate-spin"
                      aria-hidden
                    />
                  ) : (
                    <Check className="h-4 w-4" aria-hidden />
                  )}
                  {pending
                    ? savingLabel
                    : submitMode === "hold"
                      ? "Place hold"
                      : "Confirm booking"}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="clay"
                  className="h-12 flex-1 rounded-2xl text-base"
                  onClick={next}
                >
                  Continue
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      <Sheet
        open={sheet === "dates"}
        onClose={() => setSheet(null)}
        title="Stay dates"
        footer={
          <Button
            type="button"
            variant="primary"
            size="lg"
            className="h-12 w-full rounded-2xl"
            onClick={() => setSheet(null)}
          >
            Done
          </Button>
        }
      >
        {selectedUnit ? (
          <div className="pb-2 pt-1">
            <StayRangeCalendar
              key={selectedUnit.id}
              unitId={selectedUnit.id}
              excludeReservationId={edit?.reservationId}
              checkIn={checkIn}
              checkOut={checkOut}
              today={today}
              onChange={(nextCheckIn, nextCheckOut) => {
                setCheckIn(nextCheckIn);
                setCheckOut(nextCheckOut);
              }}
            />
          </div>
        ) : null}
      </Sheet>

      <Sheet
        open={sheet === "summary"}
        onClose={() => setSheet(null)}
        title="Summary"
      >
        <div className="pb-2 pt-1">
          <ReservationSummary
            unit={selectedUnit}
            checkIn={checkIn}
            checkOut={checkOut}
            nights={nights}
            guestCount={guestCount}
            guestName={guestLabel}
            lines={submittableLines}
            totals={totals}
            paymentCents={edit ? null : paymentCents}
            paymentAllocation={payment.allocation}
            alreadyPaid={edit?.paid}
            showPricing={canSetCharges}
          />
        </div>
      </Sheet>
    </div>
  );
}
