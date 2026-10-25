"use client";

import {
  Clock,
  PencilSimple as Pencil,
  ShieldCheck,
} from "@/components/ui/icons";
import { PAYMENT_ALLOCATION_LABELS, PAYMENT_METHOD_LABELS } from "@/lib/labels";
import { CHARGE_TYPE_LABELS } from "@/lib/charges";
import { formatPHP } from "@/lib/money";
import { cn } from "@/lib/utils";
import {
  dayLabel,
  plural,
  timeLabel,
} from "../../calendar/availability/stay-display";
import { ChipGroup, FormCard } from "./mobile-form-ui";
import { HOLD_OPTIONS, type ReservationDraft } from "./reservation-draft";
import { AvailabilityBanner } from "./reservation-form-parts";

function EditLink({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Edit ${label}`}
      className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-pine-mist px-3.5 text-xs font-semibold text-pine active:bg-pine/15"
    >
      <Pencil className="h-3.5 w-3.5" aria-hidden />
      Edit
    </button>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-ink/50">{label}</dt>
      <dd className="mt-0.5 break-words text-[15px] font-semibold text-pine">
        {value}
      </dd>
    </div>
  );
}

/** Step 4 on a phone: the whole booking in three cards, and how to save it. */
export function MobileReviewStep({ draft }: { draft: ReservationDraft }) {
  const {
    goTo,
    edit,
    selectedUnit,
    checkIn,
    checkOut,
    nights,
    guestCount,
    validRange,
    currentAvailability,
    unchangedStay,
    contact,
    selectedGuest,
    additional,
    selectedPlatform,
    platformReference,
    canSetCharges,
    submittableLines,
    totals,
    feeCents,
    feeCovered,
    paymentCents,
    payment,
    noPayment,
    canConfirm,
    submitMode,
    setSubmitMode,
    holdMinutes,
    setHoldMinutes,
    reviewError,
    state,
  } = draft;
  const guestName = (edit ? contact.name.trim() : selectedGuest?.name) || "—";
  const error = reviewError ?? state.error;

  return (
    <div className="space-y-3">
      <FormCard
        title="Stay"
        action={<EditLink onClick={() => goTo("stay")} label="stay" />}
      >
        <dl className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Fact label="Unit" value={selectedUnit?.label ?? "—"} />
          </div>
          <Fact
            label="Check-in"
            value={`${dayLabel(checkIn)}${selectedUnit ? ` · ${timeLabel(selectedUnit.checkInTime)}` : ""}`}
          />
          <Fact
            label="Check-out"
            value={`${dayLabel(checkOut)}${selectedUnit ? ` · ${timeLabel(selectedUnit.checkOutTime)}` : ""}`}
          />
          <div className="col-span-2">
            <Fact
              label="Length"
              value={`${plural(nights ?? 0, "night")} · ${plural(guestCount, "guest")}`}
            />
          </div>
        </dl>
        <div className="mt-4">
          <AvailabilityBanner
            valid={validRange}
            unitChosen={Boolean(selectedUnit)}
            result={currentAvailability}
            nights={nights}
            checkIn={checkIn}
            checkOut={checkOut}
            current={unchangedStay}
            changed={Boolean(edit)}
            compact
          />
        </div>
      </FormCard>

      <FormCard
        title="Guests"
        action={<EditLink onClick={() => goTo("guests")} label="guests" />}
      >
        <dl className="space-y-3.5">
          <Fact label="Primary guest" value={guestName} />
          <Fact
            label="Email"
            value={(edit ? contact.email : selectedGuest?.email) || "—"}
          />
          <Fact
            label="Phone"
            value={(edit ? contact.phone : selectedGuest?.phone) || "—"}
          />
          <Fact
            label="Also staying"
            value={
              additional.length
                ? additional.map((name) => name.trim()).join(", ")
                : "No one else"
            }
          />
          <Fact
            label="Booked through"
            value={
              selectedPlatform
                ? `${selectedPlatform.name}${platformReference.trim() ? ` · ${platformReference.trim()}` : ""}`
                : "Not set"
            }
          />
        </dl>
      </FormCard>

      {canSetCharges ? (
        <FormCard
          title="Charges & payment"
          action={<EditLink onClick={() => goTo("charges")} label="charges" />}
        >
          <ul className="divide-y divide-pine/10">
            {submittableLines.map((line, index) => (
              <li key={index} className="flex items-start gap-3 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-medium text-pine">
                    {line.description}
                  </span>
                  <span className="block text-xs text-ink/50">
                    {CHARGE_TYPE_LABELS[line.type]} · {line.quantity} ×{" "}
                    {formatPHP(line.unitAmountCents)}
                  </span>
                </span>
                <span className="shrink-0 text-[15px] font-semibold tabular-nums text-pine">
                  {formatPHP(line.quantity * line.unitAmountCents)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-2 space-y-1.5 border-t border-pine/15 pt-3">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-ink/60">Booking total</span>
              <span className="font-display text-xl tabular-nums text-pine">
                {formatPHP(totals.bookingTotalCents)}
              </span>
            </div>
            {totals.depositTotalCents ? (
              <div className="flex justify-between text-sm">
                <span className="text-ink/60">Refundable deposit</span>
                <span className="tabular-nums text-pine">
                  {formatPHP(totals.depositTotalCents)}
                </span>
              </div>
            ) : null}
            {!edit && feeCents ? (
              <div className="flex justify-between text-sm">
                <span className="text-ink/60">Reservation fee</span>
                <span
                  className={cn(
                    "tabular-nums",
                    feeCovered ? "text-pine" : "text-clay-deep",
                  )}
                >
                  {formatPHP(feeCents)} · {feeCovered ? "covered" : "unpaid"}
                </span>
              </div>
            ) : null}
          </div>
          <p className="mt-3 rounded-2xl bg-linen px-3.5 py-3 text-sm text-ink/70">
            {edit
              ? `${formatPHP(edit.paid.bookingCents)} paid so far · ${formatPHP(Math.max(0, totals.bookingTotalCents - edit.paid.bookingCents))} still due after this edit.`
              : paymentCents
                ? `${formatPHP(paymentCents)} received via ${PAYMENT_METHOD_LABELS[payment.method]} towards ${PAYMENT_ALLOCATION_LABELS[payment.allocation].toLowerCase()}${payment.reference.trim() ? ` · ref ${payment.reference.trim()}` : ""}.`
                : noPayment
                  ? "No payment received yet."
                  : "No payment entered."}
          </p>
        </FormCard>
      ) : null}

      {edit ? null : (
        <FormCard title="Save as">
          <ChipGroup
            label="Save as"
            value={submitMode}
            onChange={setSubmitMode}
            options={[
              ...(canConfirm
                ? [
                    {
                      value: "confirmed" as const,
                      label: "Confirmed booking",
                      leading: <ShieldCheck className="h-4 w-4" aria-hidden />,
                    },
                  ]
                : []),
              {
                value: "hold" as const,
                label: "Hold",
                leading: <Clock className="h-4 w-4" aria-hidden />,
              },
            ]}
          />
          <p className="mt-3 text-sm text-ink/60">
            {submitMode === "confirmed"
              ? "Locks the dates for this guest and records any payment."
              : canConfirm
                ? "Reserves the dates for a limited time while the guest pays."
                : "Reserves the dates for a limited time for someone who can confirm bookings."}
          </p>
          {submitMode === "hold" ? (
            <div className="mt-4">
              <p className="mb-2 text-sm font-semibold text-pine">Hold for</p>
              <ChipGroup
                label="Hold for"
                value={holdMinutes}
                onChange={setHoldMinutes}
                options={HOLD_OPTIONS}
              />
            </div>
          ) : null}
        </FormCard>
      )}

      {error ? (
        <p
          role="alert"
          className="rounded-2xl bg-clay-mist px-4 py-3 text-sm text-clay-deep"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
