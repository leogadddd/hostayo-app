"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Bathtub as Bath,
  Bed as BedDouble,
  Check,
  WarningCircle as CircleAlert,
  Clock,
  CircleNotch as LoaderCircle,
  Minus,
  Plus,
  Receipt,
  ArrowCounterClockwise as RotateCcw,
  ShieldCheck,
  Trash as Trash2,
  Users,
  X,
} from "@/components/ui/icons";
import { PAYMENT_ALLOCATION_LABELS, PAYMENT_METHOD_LABELS } from "@/lib/labels";
import { CHARGE_TYPE_LABELS } from "@/lib/charges";
import { addDaysLocal } from "@/lib/dates";
import { formatPHP } from "@/lib/money";
import { cn } from "@/lib/utils";
import { StepProgress } from "@/components/ui/step-progress";
import { TabBar } from "@/components/ui/tab-bar";
import { Button, buttonClassName } from "@/components/ui/button";
import { FieldError, Input, Label, Select } from "@/components/ui/input";
import { SelectMenu } from "@/components/ui/select-menu";
import { ChoiceCards } from "@/components/ui/choice-cards";
import {
  dayLabel,
  plural,
  timeLabel,
  UnitPhoto,
} from "../../calendar/availability/stay-display";
import { ReservationSummary } from "./reservation-summary";
import { StayRangeCalendar } from "./stay-range-calendar";
import { DateInput } from "@/components/ui/date-input";
import { TimeInput } from "@/components/ui/time-input";
import { PlatformLogo } from "@/components/app/platform-badge";
import { describeReservationFee } from "@/lib/reservation-fee";
import { GuestPicker } from "./guest-picker";
import { InfoTip } from "@/components/ui/info-tip";
import {
  useReservationDraft,
  STEP_LABELS,
  CHARGE_TYPE_OPTIONS,
  PAYMENT_METHOD_OPTIONS,
  HOLD_OPTIONS,
  type ReservationDraft,
  type ReservationFormProps,
} from "./reservation-draft";
import {
  StepHeading,
  AvailabilityBanner,
  SaveNowButton,
  ReviewBlock,
  ReviewItem,
  SaveOption,
} from "./reservation-form-parts";
import { MobileReservationForm } from "./mobile-reservation-form";

export type {
  ReservationEdit,
  ReservationFormProps,
  UnitOption,
} from "./reservation-draft";

export function ReservationForm(props: ReservationFormProps) {
  const draft = useReservationDraft(props);
  return props.variant === "mobile" ? (
    <MobileReservationForm draft={draft} />
  ) : (
    <DesktopReservationForm draft={draft} />
  );
}

/** The wide-screen wizard: tabs across the top, the summary beside the form. */
function DesktopReservationForm({ draft }: { draft: ReservationDraft }) {
  const {
    guests,
    units,
    canCreateGuest,
    platforms,
    canConfirm,
    canSetCharges,
    edit,
    today,
    state,
    pending,
    savingLabel,
    unitId,
    setUnitId,
    checkIn,
    setCheckIn,
    checkOut,
    setCheckOut,
    additional,
    setAdditional,
    setGuests,
    guestId,
    platformId,
    setPlatformId,
    platformReference,
    setPlatformReference,
    selectedPlatform,
    takesReference,
    contact,
    setContact,
    customCharges,
    setCustomCharges,
    noPayment,
    setNoPayment,
    payment,
    setPayment,
    receivedNow,
    setReceivedNow,
    submitMode,
    setSubmitMode,
    holdMinutes,
    setHoldMinutes,
    reviewError,
    selectedUnit,
    capacity,
    guestCount,
    validRange,
    nights,
    selectedGuest,
    chooseGuest,
    unchangedStay,
    currentAvailability,
    defaultCharges,
    parsed,
    submittableLines,
    totals,
    paymentCents,
    feeRule,
    feeCents,
    feeCovered,
    stepIssues,
    steps,
    firstBlocked,
    stepIndex,
    step,
    showIssue,
    goTo,
    next,
    setGuestCount,
    updateCharge,
    changeChargeType,
    saveNow,
    submit,
  } = draft;
  if (units.length === 0) {
    return (
      <div className="rounded-2xl border border-pine/10 bg-surface p-6 text-sm text-ink/70">
        No units are accepting bookings yet. Activate a unit first, then come
        back to place a hold or booking.
      </div>
    );
  }

  const guestLabel = (edit ? contact.name.trim() : selectedGuest?.name) || null;
  const stepItems = steps.map((id, index) => ({
    key: id,
    label: STEP_LABELS[id],
    // Checks and the lock on later steps belong to creating a booking.
    done: !edit && index < stepIndex,
    disabled: !edit && firstBlocked !== -1 && index > firstBlocked,
    onSelect: () => {
      if (id !== step) goTo(id);
    },
  }));

  return (
    <div className="min-w-0 space-y-3 lg:space-y-6">
      <div className="hidden lg:block">
        <TabBar label="Reservation steps" current={step} items={stepItems} />
      </div>
      <StepProgress
        label="Reservation steps"
        current={step}
        items={stepItems}
      />

      <div className="grid min-w-0 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] 2xl:grid-cols-[minmax(0,1fr)_26rem]">
        <div className="min-w-0">
          <section className="rounded-2xl border border-pine/10 bg-surface p-5 shadow-[0_1px_2px_rgba(32,58,53,0.06)] sm:p-6 max-lg:rounded-3xl max-lg:border-0 max-lg:p-4 max-lg:shadow-[0_4px_24px_rgba(32,58,53,0.07)] max-lg:ring-1 max-lg:ring-pine/[0.06]">
            {step === "stay" ? (
              <div className="space-y-8">
                <StepHeading
                  title="Where and when"
                  description="Pick the unit, the stay dates, and how many people are staying."
                />
                {units.length > 1 ? (
                  <fieldset>
                    <legend className="mb-2 text-sm font-medium text-ink">
                      Unit
                    </legend>
                    <div className="grid gap-3 xl:grid-cols-2">
                      {units.map((unit) => {
                        const selected = unit.id === unitId;
                        return (
                          <label
                            key={unit.id}
                            className={cn(
                              "group flex min-w-0 cursor-pointer overflow-hidden rounded-xl border transition",
                              selected
                                ? "border-clay ring-2 ring-clay/30"
                                : "border-pine/15 hover:border-pine/35",
                            )}
                          >
                            <input
                              type="radio"
                              name="unit"
                              value={unit.id}
                              checked={selected}
                              onChange={() => {
                                setUnitId(unit.id);
                                setCustomCharges(null);
                              }}
                              className="sr-only"
                            />
                            <UnitPhoto
                              src={unit.imageUrl}
                              className="w-24 shrink-0"
                            />
                            <span className="flex min-w-0 flex-1 flex-col justify-center p-3">
                              {unit.propertyName ? (
                                <span className="truncate text-[11px] font-medium uppercase tracking-wide text-clay-deep">
                                  {unit.propertyName}
                                </span>
                              ) : null}
                              <span className="truncate font-medium text-pine">
                                {unit.name}
                              </span>
                              <span className="mt-1 flex gap-3 text-xs text-ink/60">
                                <span className="flex items-center gap-1">
                                  <Users className="h-3.5 w-3.5" aria-hidden />
                                  {unit.capacity}
                                </span>
                                <span className="flex items-center gap-1">
                                  <BedDouble
                                    className="h-3.5 w-3.5"
                                    aria-hidden
                                  />
                                  {unit.bedrooms || "Studio"}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Bath className="h-3.5 w-3.5" aria-hidden />
                                  {unit.bathrooms}
                                </span>
                              </span>
                            </span>
                            {selected ? (
                              <span className="m-3 flex h-5 w-5 shrink-0 items-center justify-center self-start rounded-full bg-clay text-white">
                                <Check className="h-3 w-3" aria-hidden />
                              </span>
                            ) : null}
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>
                ) : null}

                {selectedUnit ? (
                  <StayRangeCalendar
                    // A new unit has different bookings; start its calendar fresh.
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
                ) : null}

                <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,13rem)]">
                  <div className="min-w-0">
                    <Label htmlFor="checkIn">Check-in</Label>
                    <DateInput
                      id="checkIn"
                      value={checkIn}
                      today={today}
                      size="lg"
                      onChange={(next) => {
                        setCheckIn(next);
                        if (next && checkOut <= next)
                          setCheckOut(addDaysLocal(next, 1));
                      }}
                    />
                    {selectedUnit ? (
                      <p className="mt-1 text-xs text-ink/50">
                        From {timeLabel(selectedUnit.checkInTime)}
                      </p>
                    ) : null}
                  </div>
                  <div className="min-w-0">
                    <Label htmlFor="checkOut">Check-out</Label>
                    <DateInput
                      id="checkOut"
                      value={checkOut}
                      today={today}
                      size="lg"
                      min={checkIn ? addDaysLocal(checkIn, 1) : undefined}
                      onChange={setCheckOut}
                    />
                    {selectedUnit ? (
                      <p className="mt-1 text-xs text-ink/50">
                        By {timeLabel(selectedUnit.checkOutTime)}
                      </p>
                    ) : null}
                  </div>
                  <div className="min-w-0">
                    <Label htmlFor="guest-count">Guests</Label>
                    <div className="flex h-12 items-center rounded-xl border border-pine/20 bg-surface">
                      <button
                        type="button"
                        aria-label="Fewer guests"
                        onClick={() => setGuestCount(guestCount - 1)}
                        disabled={guestCount <= 1}
                        className="flex h-full w-11 items-center justify-center rounded-l-xl text-pine hover:bg-pine-mist/60 disabled:opacity-35"
                      >
                        <Minus className="h-4 w-4" aria-hidden />
                      </button>
                      <span
                        id="guest-count"
                        className="flex flex-1 items-center justify-center gap-1.5 text-sm font-medium text-ink"
                      >
                        <Users className="h-4 w-4 text-pine/50" aria-hidden />
                        {guestCount}
                      </span>
                      <button
                        type="button"
                        aria-label="More guests"
                        onClick={() => setGuestCount(guestCount + 1)}
                        disabled={guestCount >= capacity}
                        className="flex h-full w-11 items-center justify-center rounded-r-xl text-pine hover:bg-pine-mist/60 disabled:opacity-35"
                      >
                        <Plus className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-ink/50">
                      This unit sleeps {capacity}.
                    </p>
                  </div>
                </div>

                <AvailabilityBanner
                  valid={validRange}
                  unitChosen={Boolean(selectedUnit)}
                  result={currentAvailability}
                  nights={nights}
                  checkIn={checkIn}
                  checkOut={checkOut}
                  current={unchangedStay}
                  changed={Boolean(edit)}
                />
              </div>
            ) : null}

            {step === "guests" ? (
              <div className="space-y-8">
                <StepHeading
                  title="Who’s staying"
                  description="The primary guest is who the reservation is for. Add names for everyone else staying."
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="mb-2 text-sm font-medium text-ink">
                      Primary guest
                    </h3>
                    <InfoTip>
                      Type to search your guests, or add a new guest if they’re
                      not there yet. When editing, correcting the contact
                      details also updates the guest’s profile on all of their
                      reservations.
                    </InfoTip>
                  </div>
                  <GuestPicker
                    guests={guests}
                    value={guestId}
                    onChange={(id) => chooseGuest(id)}
                    onCreated={(guest) => {
                      const next = [...guests, guest];
                      setGuests(next);
                      chooseGuest(guest.id, next);
                    }}
                    canCreate={canCreateGuest}
                  />
                  {edit && selectedGuest ? (
                    <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      <div>
                        <Label htmlFor="contactName">Full name</Label>
                        <Input
                          id="contactName"
                          value={contact.name}
                          onChange={(event) =>
                            setContact({ ...contact, name: event.target.value })
                          }
                          maxLength={120}
                        />
                      </div>
                      <div>
                        <Label htmlFor="contactEmail">Email</Label>
                        <Input
                          id="contactEmail"
                          type="email"
                          value={contact.email}
                          onChange={(event) =>
                            setContact({
                              ...contact,
                              email: event.target.value,
                            })
                          }
                          maxLength={200}
                          placeholder="guest@example.com"
                        />
                      </div>
                      <div>
                        <Label htmlFor="contactPhone">Phone</Label>
                        <Input
                          id="contactPhone"
                          type="tel"
                          value={contact.phone}
                          onChange={(event) =>
                            setContact({
                              ...contact,
                              phone: event.target.value,
                            })
                          }
                          maxLength={40}
                          placeholder="+63 9xx xxx xxxx"
                        />
                      </div>
                    </div>
                  ) : null}
                </div>

                {platforms.length ? (
                  <fieldset className="border-t border-pine/10 pt-6">
                    <legend className="sr-only">Booked through</legend>
                    <div className="flex items-center gap-1.5">
                      <h3
                        className="font-display text-lg text-pine"
                        aria-hidden
                      >
                        Booked through
                      </h3>
                      <InfoTip>Where this booking came from.</InfoTip>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {platforms.map((platform) => {
                        const selected = platform.id === platformId;
                        return (
                          <label
                            key={platform.id}
                            className={cn(
                              "inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition",
                              selected
                                ? "border-clay bg-clay-mist/40 text-pine ring-2 ring-clay/30"
                                : "border-pine/15 text-pine hover:border-pine/35",
                            )}
                          >
                            <input
                              type="radio"
                              name="platform"
                              value={platform.id}
                              checked={selected}
                              onChange={() => {
                                setPlatformId(platform.id);
                                // No booking code on this platform, so none to keep.
                                if (!platform.hasBookingCode)
                                  setPlatformReference("");
                              }}
                              className="sr-only"
                            />
                            <PlatformLogo platform={platform} />
                            {platform.name}
                          </label>
                        );
                      })}
                    </div>
                    {takesReference ? (
                      <div className="mt-4 max-w-sm">
                        <Label htmlFor="platformReference">
                          {selectedPlatform
                            ? `${selectedPlatform.name} booking code`
                            : "Booking code"}{" "}
                          <span className="font-normal text-ink/45">
                            · optional
                          </span>
                        </Label>
                        <Input
                          id="platformReference"
                          value={platformReference}
                          onChange={(event) =>
                            setPlatformReference(event.target.value)
                          }
                          maxLength={80}
                          placeholder="e.g. HMABC12345"
                        />
                      </div>
                    ) : null}
                  </fieldset>
                ) : null}

                <div className="border-t border-pine/10 pt-6">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-display text-lg text-pine">
                        Additional guests
                      </h3>
                      <InfoTip>
                        Names for entry letters or contracts. These don’t create
                        guest profiles.
                      </InfoTip>
                    </div>
                    <span className="text-xs text-ink/55">
                      {guestCount} of {capacity} guests
                    </span>
                  </div>
                  {additional.length ? (
                    <ul className="mt-4 grid gap-3 md:grid-cols-2">
                      {additional.map((name, index) => (
                        <li key={index} className="flex items-end gap-2">
                          <div className="min-w-0 flex-1">
                            <Label htmlFor={`occupant-${index}`}>
                              Guest {index + 2}
                            </Label>
                            <Input
                              id={`occupant-${index}`}
                              value={name}
                              onChange={(event) =>
                                setAdditional(
                                  additional.map((value, position) =>
                                    position === index
                                      ? event.target.value
                                      : value,
                                  ),
                                )
                              }
                              maxLength={120}
                              placeholder="Full legal name"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setAdditional(
                                additional.filter(
                                  (_, position) => position !== index,
                                ),
                              )
                            }
                            aria-label={`Remove guest ${index + 2}`}
                            className="mb-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-ink/50 hover:bg-clay-mist hover:text-clay-deep"
                          >
                            <X className="h-4 w-4" aria-hidden />
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    disabled={guestCount >= capacity}
                    onClick={() => setGuestCount(guestCount + 1)}
                  >
                    <Plus className="h-4 w-4" aria-hidden />
                    Add guest
                  </Button>
                </div>
              </div>
            ) : null}

            {step === "charges" && canSetCharges ? (
              <div className="space-y-8">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <StepHeading
                    title="Charges"
                    description={
                      edit
                        ? "This reservation’s current charges. Edit any line, or reset to the unit’s rates for the new dates."
                        : "Built from the unit’s rates. Edit any line for a negotiated price, fee, or discount."
                    }
                  />
                  {customCharges !== null ? (
                    <button
                      type="button"
                      onClick={() => setCustomCharges(null)}
                      className="inline-flex items-center gap-1.5 text-sm text-pine/70 underline-offset-4 hover:text-pine hover:underline"
                    >
                      <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                      Reset to unit defaults
                    </button>
                  ) : null}
                </div>
                <div className="space-y-3">
                  <ul className="space-y-3">
                    {parsed.map(({ draft, line }) => {
                      const quantity = Number(draft.quantity);
                      const subtotal =
                        line && Number.isInteger(quantity) && quantity >= 1
                          ? line.quantity * line.unitAmountCents
                          : null;
                      return (
                        <li
                          key={draft.key}
                          className={cn(
                            "grid grid-cols-2 items-end gap-3 rounded-xl border p-3 sm:grid-cols-[10rem_minmax(0,1fr)_5rem_8rem_6rem_2rem]",
                            line
                              ? "border-pine/10"
                              : "border-clay/40 bg-clay-mist/30",
                          )}
                        >
                          <div className="col-span-2 sm:col-span-1">
                            <Label htmlFor={`charge-type-${draft.key}`}>
                              Type
                            </Label>
                            <SelectMenu
                              id={`charge-type-${draft.key}`}
                              value={draft.type}
                              options={CHARGE_TYPE_OPTIONS}
                              onChange={(type) => changeChargeType(draft, type)}
                            />
                          </div>
                          <div className="col-span-2 sm:col-span-1">
                            <Label>Description</Label>
                            <Input
                              className="max-sm:h-11 max-sm:text-base"
                              value={draft.description}
                              onChange={(event) =>
                                updateCharge(draft.key, {
                                  description: event.target.value,
                                })
                              }
                              placeholder={
                                draft.type === "accommodation"
                                  ? "Accommodation (3 nights)"
                                  : "Describe the charge"
                              }
                            />
                          </div>
                          <div>
                            <Label>Qty</Label>
                            <Input
                              className="max-sm:h-11 max-sm:text-base"
                              value={draft.quantity}
                              inputMode="numeric"
                              onChange={(event) =>
                                updateCharge(draft.key, {
                                  quantity: event.target.value,
                                })
                              }
                            />
                          </div>
                          <div>
                            <Label>
                              {draft.type === "discount"
                                ? "Amount (₱, negative)"
                                : "Amount (₱)"}
                            </Label>
                            <Input
                              className="max-sm:h-11 max-sm:text-base"
                              value={draft.amountInput}
                              inputMode="decimal"
                              placeholder="5500"
                              onChange={(event) =>
                                updateCharge(draft.key, {
                                  amountInput: event.target.value,
                                })
                              }
                            />
                          </div>
                          <p className="pb-2.5 text-sm text-ink/70 max-sm:pb-0 max-sm:text-base max-sm:font-semibold max-sm:text-pine">
                            {subtotal === null ? "—" : formatPHP(subtotal)}
                          </p>
                          <button
                            type="button"
                            onClick={() =>
                              setCustomCharges((current) =>
                                (current ?? defaultCharges).filter(
                                  (item) => item.key !== draft.key,
                                ),
                              )
                            }
                            aria-label="Remove charge line"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-clay-deep hover:bg-clay-mist max-sm:h-11 max-sm:w-11 max-sm:justify-self-end max-sm:rounded-full max-sm:bg-clay-mist/60"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCustomCharges((current) => [
                        ...(current ?? defaultCharges),
                        {
                          key: crypto.randomUUID(),
                          type: "fee",
                          description: "",
                          quantity: "1",
                          amountInput: "",
                        },
                      ])
                    }
                  >
                    <Plus className="h-4 w-4" aria-hidden />
                    Add charge line
                  </Button>
                </div>

                {edit ? (
                  <div className="border-t border-pine/10 pt-6">
                    <h3 className="font-display text-lg text-pine">Payments</h3>
                    <p className="text-sm text-ink/60">
                      Payments are ledger entries and don’t change here.
                      Changing charges changes what’s still due.
                    </p>
                    <dl className="mt-4 grid gap-3 sm:grid-cols-3">
                      <ReviewItem
                        label="Paid towards booking"
                        value={formatPHP(edit.paid.bookingCents)}
                      />
                      <ReviewItem
                        label="Deposit collected"
                        value={formatPHP(edit.paid.depositCents)}
                      />
                      <ReviewItem
                        label="Still due after this edit"
                        value={formatPHP(
                          Math.max(
                            0,
                            totals.bookingTotalCents - edit.paid.bookingCents,
                          ),
                        )}
                      />
                    </dl>
                    <Link
                      href={`/reservations/${edit.reservationId}/payments/new`}
                      className={buttonClassName("outline", "sm", "mt-4")}
                    >
                      <Plus className="h-4 w-4" aria-hidden />
                      Record payment
                    </Link>
                  </div>
                ) : (
                  <div className="border-t border-pine/10 pt-6">
                    <h3 className="font-display text-lg text-pine">
                      Payment received
                    </h3>
                    <p className="text-sm text-ink/60">
                      Optional. Recorded with a confirmed booking so the balance
                      starts accurate.
                    </p>
                    {feeCents ? (
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-clay/30 bg-clay-mist/40 px-4 py-3 text-sm">
                        <p className="text-ink/75">
                          <span className="font-medium text-clay-deep">
                            Reservation fee {formatPHP(feeCents)}
                          </span>
                          {feeRule?.type === "percent" ? (
                            <span className="text-ink/55">
                              {" "}
                              ({describeReservationFee(feeRule)})
                            </span>
                          ) : null}
                          <span className="block text-xs text-ink/55">
                            Needed to confirm this booking. Place a hold until
                            the guest pays it.
                          </span>
                        </p>
                        {!noPayment && !feeCovered ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setPayment({
                                ...payment,
                                amount: String(feeCents / 100),
                                allocation: "booking",
                              })
                            }
                          >
                            Enter {formatPHP(feeCents)}
                          </Button>
                        ) : null}
                      </div>
                    ) : null}
                    <label className="mt-4 flex items-start gap-2 text-sm text-ink">
                      <input
                        type="checkbox"
                        className="mt-0.5 accent-pine"
                        checked={noPayment}
                        onChange={(event) => {
                          setNoPayment(event.target.checked);
                          if (event.target.checked)
                            setPayment({ ...payment, amount: "" });
                        }}
                      />
                      <span>No payment received yet</span>
                    </label>
                    {noPayment ? (
                      <p className="mt-3 rounded-xl bg-linen px-4 py-3 text-sm text-ink/70">
                        The booking total of{" "}
                        <strong>{formatPHP(totals.bookingTotalCents)}</strong>{" "}
                        stays due from the guest. Record payments from the
                        reservation once they arrive.
                      </p>
                    ) : (
                      <div className="mt-5 space-y-5">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <Label htmlFor="payment-amount">
                              Amount received (₱)
                            </Label>
                            <Input
                              id="payment-amount"
                              value={payment.amount}
                              onChange={(event) =>
                                setPayment({
                                  ...payment,
                                  amount: event.target.value,
                                })
                              }
                              inputMode="decimal"
                              placeholder="e.g. 3,000"
                            />
                          </div>
                          <div>
                            <Label htmlFor="payment-reference">
                              Reference (optional)
                            </Label>
                            <Input
                              id="payment-reference"
                              value={payment.reference}
                              onChange={(event) =>
                                setPayment({
                                  ...payment,
                                  reference: event.target.value,
                                })
                              }
                              maxLength={120}
                              placeholder="GCash reference or sender"
                            />
                          </div>
                        </div>
                        <div>
                          <p
                            id="payment-allocation"
                            className="mb-1.5 text-sm font-medium text-ink"
                          >
                            Towards
                          </p>
                          <ChoiceCards
                            aria-labelledby="payment-allocation"
                            value={payment.allocation}
                            onChange={(allocation) =>
                              setPayment({ ...payment, allocation })
                            }
                            options={[
                              {
                                value: "booking",
                                label: PAYMENT_ALLOCATION_LABELS.booking,
                                icon: Receipt,
                                description: `Counts toward the ${formatPHP(totals.bookingTotalCents)} booking total`,
                              },
                              {
                                value: "security_deposit",
                                label:
                                  PAYMENT_ALLOCATION_LABELS.security_deposit,
                                icon: ShieldCheck,
                                description: totals.depositTotalCents
                                  ? `Refundable ${formatPHP(totals.depositTotalCents)}, returned after checkout`
                                  : "Add a security deposit charge first",
                                disabled:
                                  !totals.depositTotalCents &&
                                  payment.allocation !== "security_deposit",
                              },
                            ]}
                          />
                        </div>
                        <div>
                          <p
                            id="payment-method"
                            className="mb-1.5 text-sm font-medium text-ink"
                          >
                            Method
                          </p>
                          <ChoiceCards
                            aria-labelledby="payment-method"
                            columns={4}
                            value={payment.method}
                            onChange={(method) =>
                              setPayment({ ...payment, method })
                            }
                            options={PAYMENT_METHOD_OPTIONS}
                          />
                        </div>
                        <div>
                          <label className="flex items-start gap-2 text-sm text-ink">
                            <input
                              type="checkbox"
                              className="mt-0.5 accent-pine"
                              checked={receivedNow}
                              onChange={(event) => {
                                setReceivedNow(event.target.checked);
                                if (
                                  !event.target.checked &&
                                  !payment.receivedAt
                                )
                                  setPayment({
                                    ...payment,
                                    receivedAt: `${today}T12:00`,
                                  });
                              }}
                            />
                            <span>Received just now</span>
                            <InfoTip>
                              Uncheck to enter when it arrived, in the property
                              timezone.
                            </InfoTip>
                          </label>
                          {!receivedNow ? (
                            // Date and time kept together as YYYY-MM-DDTHH:mm.
                            <div className="mt-3 grid max-w-md grid-cols-[minmax(0,1fr)_7rem] gap-2">
                              <DateInput
                                aria-label="Date received"
                                value={payment.receivedAt.slice(0, 10)}
                                today={today}
                                max={today}
                                onChange={(date) =>
                                  setPayment({
                                    ...payment,
                                    receivedAt: `${date}T${payment.receivedAt.slice(11, 16) || "12:00"}`,
                                  })
                                }
                              />
                              <TimeInput
                                aria-label="Time received"
                                value={payment.receivedAt.slice(11, 16)}
                                onChange={(time) =>
                                  setPayment({
                                    ...payment,
                                    receivedAt: `${payment.receivedAt.slice(0, 10)}T${time}`,
                                  })
                                }
                              />
                            </div>
                          ) : null}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : null}

            {step === "review" ? (
              <div className="space-y-6">
                <StepHeading
                  title="Review and save"
                  description="Check everything before saving. Saving runs the final conflict check."
                />
                <ReviewBlock title="Stay" onEdit={() => goTo("stay")}>
                  <div className="flex min-w-0 gap-4">
                    <UnitPhoto
                      src={selectedUnit?.imageUrl ?? null}
                      className="hidden h-20 w-28 shrink-0 rounded-lg sm:block"
                    />
                    <dl className="grid min-w-0 flex-1 gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
                      <ReviewItem
                        label="Unit"
                        value={selectedUnit?.label ?? "—"}
                      />
                      <ReviewItem
                        label="Check-in"
                        value={`${dayLabel(checkIn)} · ${selectedUnit ? timeLabel(selectedUnit.checkInTime) : ""}`}
                      />
                      <ReviewItem
                        label="Check-out"
                        value={`${dayLabel(checkOut)} · ${selectedUnit ? timeLabel(selectedUnit.checkOutTime) : ""}`}
                      />
                      <ReviewItem
                        label="Length"
                        value={`${plural(nights ?? 0, "night")} · ${plural(guestCount, "guest")}`}
                      />
                    </dl>
                  </div>
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
                </ReviewBlock>
                <ReviewBlock title="Guests" onEdit={() => goTo("guests")}>
                  <dl className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
                    <ReviewItem
                      label="Primary guest"
                      value={guestLabel ?? "—"}
                    />
                    <ReviewItem
                      label="Email"
                      value={
                        (edit ? contact.email : selectedGuest?.email) || "—"
                      }
                    />
                    <ReviewItem
                      label="Phone"
                      value={
                        (edit ? contact.phone : selectedGuest?.phone) || "—"
                      }
                    />
                    <ReviewItem
                      label="Also staying"
                      value={
                        additional.length
                          ? additional.map((name) => name.trim()).join(", ")
                          : "No one else"
                      }
                    />
                    <ReviewItem
                      label="Booked through"
                      value={
                        selectedPlatform
                          ? `${selectedPlatform.name}${platformReference.trim() ? ` · ${platformReference.trim()}` : ""}`
                          : "Not set"
                      }
                    />
                  </dl>
                </ReviewBlock>
                {canSetCharges ? (
                  <ReviewBlock
                    title="Charges & payment"
                    onEdit={() => goTo("charges")}
                  >
                    <table className="w-full text-sm">
                      <tbody className="divide-y divide-pine/10">
                        {submittableLines.map((line, index) => (
                          <tr key={index}>
                            <td className="py-2 pr-3 text-ink/75">
                              {line.description}
                              <span className="text-ink/45">
                                {" "}
                                · {CHARGE_TYPE_LABELS[line.type]}
                              </span>
                            </td>
                            <td className="py-2 text-right text-ink/60">
                              {line.quantity} ×{" "}
                              {formatPHP(line.unitAmountCents)}
                            </td>
                            <td className="py-2 pl-3 text-right font-medium text-pine">
                              {formatPHP(line.quantity * line.unitAmountCents)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="border-t border-pine/15">
                        <tr>
                          <td colSpan={2} className="pt-3 text-ink/60">
                            Booking total
                          </td>
                          <td className="pt-3 text-right font-display text-lg text-pine">
                            {formatPHP(totals.bookingTotalCents)}
                          </td>
                        </tr>
                        {totals.depositTotalCents ? (
                          <tr>
                            <td colSpan={2} className="text-ink/60">
                              Refundable deposit
                            </td>
                            <td className="text-right text-pine">
                              {formatPHP(totals.depositTotalCents)}
                            </td>
                          </tr>
                        ) : null}
                        {!edit && feeCents ? (
                          <tr>
                            <td colSpan={2} className="text-ink/60">
                              Reservation fee
                            </td>
                            <td
                              className={cn(
                                "text-right",
                                feeCovered ? "text-pine" : "text-clay-deep",
                              )}
                            >
                              {formatPHP(feeCents)} ·{" "}
                              {feeCovered ? "covered" : "unpaid"}
                            </td>
                          </tr>
                        ) : null}
                      </tfoot>
                    </table>
                    <p className="mt-3 rounded-lg bg-linen px-3 py-2 text-sm text-ink/70">
                      {edit
                        ? `${formatPHP(edit.paid.bookingCents)} paid so far · ${formatPHP(Math.max(0, totals.bookingTotalCents - edit.paid.bookingCents))} still due after this edit.`
                        : paymentCents
                          ? `${formatPHP(paymentCents)} received via ${PAYMENT_METHOD_LABELS[payment.method]} towards ${PAYMENT_ALLOCATION_LABELS[payment.allocation].toLowerCase()}${payment.reference.trim() ? ` · ref ${payment.reference.trim()}` : ""}.`
                          : noPayment
                            ? "No payment received yet."
                            : "No payment entered."}
                    </p>
                  </ReviewBlock>
                ) : null}

                {edit ? null : (
                  <fieldset>
                    <legend className="mb-3 font-display text-lg text-pine">
                      Save as
                    </legend>
                    <div
                      className={cn(
                        "grid gap-3",
                        canConfirm && "md:grid-cols-2",
                      )}
                    >
                      {canConfirm ? (
                        <SaveOption
                          active={submitMode === "confirmed"}
                          onSelect={() => setSubmitMode("confirmed")}
                          icon={ShieldCheck}
                          title="Confirmed booking"
                          description="Locks the dates for this guest and records any payment."
                        />
                      ) : null}
                      <SaveOption
                        active={submitMode === "hold"}
                        onSelect={() => setSubmitMode("hold")}
                        icon={Clock}
                        title="Hold"
                        description={
                          canConfirm
                            ? "Reserves the dates for a limited time while the guest pays."
                            : "Reserves the dates for a limited time for someone who can confirm bookings."
                        }
                      >
                        <div
                          className="mt-3 max-w-48"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <Label htmlFor="holdMinutes">Hold for</Label>
                          <Select
                            id="holdMinutes"
                            value={holdMinutes}
                            onChange={(event) => {
                              setHoldMinutes(event.target.value);
                              setSubmitMode("hold");
                            }}
                          >
                            {HOLD_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </Select>
                        </div>
                      </SaveOption>
                    </div>
                  </fieldset>
                )}
                <FieldError message={reviewError ?? state.error} />
              </div>
            ) : null}

            {showIssue && stepIssues[step] ? (
              <p
                role="alert"
                className="mt-6 flex items-center gap-2 rounded-xl bg-clay-mist px-4 py-3 text-sm text-clay-deep"
              >
                <CircleAlert className="h-4 w-4 shrink-0" aria-hidden />
                {stepIssues[step]}
              </p>
            ) : null}

            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-pine/10 pt-5 max-lg:sticky max-lg:bottom-0 max-lg:z-10 max-lg:-mx-4 max-lg:-mb-4 max-lg:mt-6 max-lg:flex-nowrap max-lg:rounded-b-3xl max-lg:bg-surface/95 max-lg:px-4 max-lg:pb-3 max-lg:pt-3 max-lg:shadow-[0_-8px_24px_rgba(32,58,53,0.08)] max-lg:backdrop-blur">
              {edit ? (
                <>
                  <Link
                    href={`/reservations/${edit.reservationId}`}
                    className={buttonClassName("ghost", "md")}
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
                      className={buttonClassName("ghost", "md")}
                    >
                      Cancel
                    </Link>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => goTo(steps[stepIndex - 1]!, true)}
                      className="max-lg:h-12"
                    >
                      <ArrowLeft className="h-4 w-4" aria-hidden />
                      Back
                    </Button>
                  )}
                  {step === "review" ? (
                    <Button
                      type="button"
                      variant="clay"
                      size="lg"
                      onClick={submit}
                      disabled={pending}
                      className="max-lg:h-12 max-lg:flex-1"
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
                      size="lg"
                      onClick={next}
                      className="max-lg:h-12 max-lg:flex-1"
                    >
                      <span className="lg:hidden">Continue</span>
                      <span className="hidden lg:inline">
                        Continue to{" "}
                        {STEP_LABELS[steps[stepIndex + 1]!].toLowerCase()}
                      </span>
                      <ArrowRight className="h-4 w-4" aria-hidden />
                    </Button>
                  )}
                </>
              )}
            </div>
            {edit ? <FieldError message={reviewError ?? state.error} /> : null}
          </section>
        </div>

        <aside className="min-w-0 lg:sticky lg:top-0">
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
        </aside>
      </div>
    </div>
  );
}
