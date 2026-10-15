"use client";

import { useActionState, useRef, useState, type ReactNode } from "react";
import {
  Banknote,
  Ban,
  CalendarDays,
  Clock,
  Moon,
  Percent,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import { ChoiceCards } from "@/components/ui/choice-cards";
import { Input, Label } from "@/components/ui/input";
import { NumberStepper } from "@/components/ui/number-stepper";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import { useSaveAndReturn } from "@/hooks/use-save-and-return";
import { formatPHP, MoneyParseError, pesosToCentavos } from "@/lib/money";
import {
  accommodationTotal,
  WEEKDAYS,
  type DayRates,
  type Weekday,
} from "@/lib/rates";
import { reservationFeeCents } from "@/lib/reservation-fee";
import { cn } from "@/lib/utils";
import type { InventoryFormState } from "./actions";
import {
  FormAside,
  FormLayout,
  FormSection,
  PesoInput,
  useFormValues,
} from "./form-kit";

export type ReservationFeeChoice = "" | "fixed" | "percent";

export interface PricingFormValues {
  nightlyRate: string;
  cleaningFee: string;
  securityDeposit: string;
  dayRates: Partial<Record<Weekday, string>>;
  reservationFeeType: ReservationFeeChoice;
  reservationFeeAmount: string;
  extensionsEnabled: boolean;
  maxExtensionHours: string;
  extensionHourlyRate: string;
}

const FEE_OPTIONS = [
  {
    value: "",
    label: "None",
    description: "Confirm without a down payment.",
    icon: Ban,
  },
  {
    value: "fixed",
    label: "Fixed amount",
    description: "The same amount for every booking.",
    icon: Banknote,
  },
  {
    value: "percent",
    label: "Percentage",
    description: "A share of the booking total.",
    icon: Percent,
  },
] as const;

/** Centavos from a typed peso amount, or null when blank or not yet valid. */
function parseCents(value: string | undefined): number | null {
  if (!value?.trim()) return null;
  try {
    return pesosToCentavos(value);
  } catch (error) {
    if (error instanceof MoneyParseError) return null;
    throw error;
  }
}

// Fixed example dates (a Monday and a Friday) to show a weekday and a weekend stay.
const WEEKDAY_EXAMPLE = "2026-10-12";
const WEEKEND_EXAMPLE = "2026-10-16";

/**
 * A unit's pricing on a page of its own: the regular rate, rates by weekday,
 * fees and deposit, the down payment, and late check-out. A live summary
 * beside the form shows what a guest would pay.
 */
export function UnitPricingForm({
  action,
  destination,
  successMessage,
  values,
  unitName,
  propertyName,
  cancelHref,
  cancelLabel,
  submitLabel = "Save pricing",
}: {
  action: (
    state: InventoryFormState,
    formData: FormData,
  ) => Promise<InventoryFormState>;
  destination: string | ((result: InventoryFormState) => string);
  successMessage: string;
  values: PricingFormValues;
  unitName: string;
  propertyName: string;
  cancelHref: string;
  cancelLabel?: string;
  submitLabel?: string;
}) {
  const save = useSaveAndReturn(action, destination, successMessage);
  const [state, formAction, pending] = useActionState<
    InventoryFormState,
    FormData
  >(save, {});
  useActionFeedback(state);
  const formRef = useRef<HTMLFormElement>(null);
  const { values: live, read } = useFormValues(formRef);

  const [rates, setRates] = useState(values.dayRates);
  const [weekend, setWeekend] = useState("");
  const [feeType, setFeeType] = useState(values.reservationFeeType);
  const [feeAmount, setFeeAmount] = useState(values.reservationFeeAmount);
  const [lateOn, setLateOn] = useState(values.extensionsEnabled);

  const baseCents = parseCents(live.nightlyRate ?? values.nightlyRate) ?? 0;
  const dayRates: DayRates = {};
  for (const { key } of WEEKDAYS) {
    const cents = parseCents(rates[key]);
    if (cents !== null) dayRates[key] = cents;
  }
  const cleaningCents = parseCents(live.cleaningFee ?? values.cleaningFee) ?? 0;
  const depositCents =
    parseCents(live.securityDeposit ?? values.securityDeposit) ?? 0;

  const quote = (checkIn: string) => {
    const stay = accommodationTotal({
      checkIn,
      nights: 2,
      baseCents,
      dayRates,
    });
    return { stay, total: stay + cleaningCents };
  };
  const weekday = quote(WEEKDAY_EXAMPLE);
  const weekendQuote = quote(WEEKEND_EXAMPLE);
  const weekendDiffers = weekendQuote.stay !== weekday.stay;

  let downPayment: number | null = null;
  if (feeType === "fixed") {
    const cents = parseCents(feeAmount);
    if (cents)
      downPayment = reservationFeeCents(
        { type: "fixed", amount: cents },
        weekday.total,
      );
  } else if (feeType === "percent") {
    const percent = Number(feeAmount);
    if (Number.isFinite(percent) && percent > 0 && percent <= 100) {
      downPayment = reservationFeeCents(
        { type: "percent", amount: Math.round(percent * 100) },
        weekday.total,
      );
    }
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      onInput={read}
      onChange={read}
      onClick={read}
    >
      <FormLayout
        aside={
          <FormAside
            preview={
              <div className="p-5">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-pine-mist px-2.5 py-0.5 text-xs font-medium text-pine">
                  <Wallet className="h-3.5 w-3.5" aria-hidden />
                  Pricing
                </span>
                <p className="mt-3 truncate font-display text-2xl text-pine">
                  {unitName}
                </p>
                <p className="mt-0.5 truncate text-sm text-ink/55">
                  {propertyName}
                </p>

                <p className="mt-5 text-xs font-medium uppercase tracking-wide text-ink/45">
                  Regular rate
                </p>
                <p className="font-display text-4xl tabular-nums text-pine">
                  {baseCents ? formatPHP(baseCents) : "Not set"}
                  {baseCents ? (
                    <span className="ml-1 text-base text-ink/50">/ night</span>
                  ) : null}
                </p>

                {baseCents ? (
                  <div className="mt-5 space-y-2 rounded-xl bg-paper/70 p-3.5 text-sm">
                    <p className="text-xs font-medium uppercase tracking-wide text-ink/45">
                      What a guest pays
                    </p>
                    <SummaryRow
                      label={weekendDiffers ? "Weekday, 2 nights" : "2 nights"}
                      value={formatPHP(weekday.total)}
                    />
                    {weekendDiffers ? (
                      <SummaryRow
                        label="Weekend, 2 nights"
                        value={formatPHP(weekendQuote.total)}
                      />
                    ) : null}
                    {cleaningCents ? (
                      <p className="text-xs text-ink/50">
                        Includes {formatPHP(cleaningCents)} cleaning.
                      </p>
                    ) : null}
                  </div>
                ) : null}

                <dl className="mt-4 space-y-2 text-sm">
                  {downPayment ? (
                    <SummaryRow
                      label="To confirm a booking"
                      value={formatPHP(downPayment)}
                    />
                  ) : null}
                  {depositCents ? (
                    <SummaryRow
                      label="Refundable deposit"
                      value={formatPHP(depositCents)}
                    />
                  ) : null}
                </dl>
              </div>
            }
            error={state.error}
            pending={pending}
            submitLabel={submitLabel}
            pendingLabel="Saving…"
            cancelHref={cancelHref}
            cancelLabel={cancelLabel}
          />
        }
      >
        <FormSection
          title="Nightly rate"
          description="The regular price for one night. Days you set below use their own rate."
        >
          <div className="flex items-center gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-clay-mist text-clay-deep">
              <Moon className="h-6 w-6" aria-hidden />
            </span>
            <div className="min-w-0 flex-1 sm:max-w-xs">
              <Label htmlFor="pricing-nightly" className="sr-only">
                Nightly rate
              </Label>
              <PesoInput
                id="pricing-nightly"
                name="nightlyRate"
                defaultValue={values.nightlyRate}
                placeholder="5,500"
                className="h-14 pl-9 text-2xl font-semibold text-pine"
              />
            </div>
          </div>
        </FormSection>

        <FormSection
          title="Rates by day"
          description="Charge more on busy nights. A night is priced by the day it starts, and blank days use the regular rate."
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
            {WEEKDAYS.map((day) => {
              const cents = parseCents(rates[day.key]);
              const diff = cents === null ? null : cents - baseCents;
              const weekendDay = day.key === "5" || day.key === "6";
              return (
                <div
                  key={day.key}
                  className={cn(
                    "rounded-xl border p-2.5",
                    cents !== null
                      ? "border-clay/40 bg-clay-mist/30"
                      : "border-pine/12 bg-paper/50",
                  )}
                >
                  <Label
                    htmlFor={`day-rate-${day.key}`}
                    className={cn(
                      "mb-1 text-xs",
                      weekendDay && "text-clay-deep",
                    )}
                  >
                    {day.short}
                  </Label>
                  <PesoInput
                    id={`day-rate-${day.key}`}
                    name={`dayRate-${day.key}`}
                    aria-label={`${day.long} night rate`}
                    value={rates[day.key] ?? ""}
                    onChange={(event) =>
                      setRates((current) => ({
                        ...current,
                        [day.key]: event.target.value,
                      }))
                    }
                    placeholder={
                      baseCents ? String(baseCents / 100) : "Regular"
                    }
                    className="h-9 px-2 pl-6 text-sm"
                  />
                  <p className="mt-1 h-4 text-[11px] tabular-nums text-ink/50">
                    {diff === null || diff === 0
                      ? ""
                      : `${diff > 0 ? "+" : "−"}${formatPHP(Math.abs(diff))}`}
                  </p>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-pine/10 pt-4">
            <span className="text-sm text-ink/60">Fri &amp; Sat nights</span>
            <div className="w-36">
              <PesoInput
                aria-label="Weekend rate"
                value={weekend}
                onChange={(event) => setWeekend(event.target.value)}
                placeholder="7,000"
                className="h-9"
              />
            </div>
            <button
              type="button"
              disabled={!weekend.trim()}
              onClick={() =>
                setRates((current) => ({
                  ...current,
                  "5": weekend,
                  "6": weekend,
                }))
              }
              className="h-9 rounded-lg border border-pine/20 px-3 text-sm font-medium text-pine transition-colors hover:border-pine/45 hover:bg-pine-mist/60 disabled:opacity-40"
            >
              Apply
            </button>
            <button
              type="button"
              onClick={() => setRates({})}
              className="ml-auto text-sm text-ink/50 underline-offset-4 hover:text-clay-deep hover:underline"
            >
              Clear all
            </button>
          </div>
        </FormSection>

        <FormSection
          title="Fees and deposit"
          description="Added on top of the nightly rate. Both are optional."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <FeeCard
              icon={Sparkles}
              title="Cleaning fee"
              hint="Charged once per stay."
              htmlFor="pricing-cleaning"
            >
              <PesoInput
                id="pricing-cleaning"
                name="cleaningFee"
                defaultValue={values.cleaningFee}
                placeholder="500"
              />
            </FeeCard>
            <FeeCard
              icon={ShieldCheck}
              title="Security deposit"
              hint="Refundable. Counted apart from income."
              htmlFor="pricing-deposit"
            >
              <PesoInput
                id="pricing-deposit"
                name="securityDeposit"
                defaultValue={values.securityDeposit}
                placeholder="2,000"
              />
            </FeeCard>
          </div>
        </FormSection>

        <FormSection
          title="Reservation fee"
          description="The down payment needed to confirm a booking made directly, on Facebook or Messenger. Not charged on Airbnb, Agoda and other platforms that collect payment."
        >
          <input type="hidden" name="reservationFeeType" value={feeType} />
          <ChoiceCards
            aria-label="Reservation fee type"
            columns={3}
            value={feeType}
            onChange={(next) => {
              if (next !== feeType) setFeeAmount("");
              setFeeType(next);
            }}
            options={FEE_OPTIONS}
          />
          {feeType ? (
            <div className="mt-4 max-w-56">
              <Label htmlFor="reservation-fee-amount">
                {feeType === "fixed"
                  ? "Amount"
                  : "Percent of the booking total"}
              </Label>
              {feeType === "fixed" ? (
                <PesoInput
                  id="reservation-fee-amount"
                  name="reservationFeeAmount"
                  value={feeAmount}
                  onChange={(event) => setFeeAmount(event.target.value)}
                  placeholder="1,000"
                  required
                />
              ) : (
                <div className="relative">
                  <Input
                    id="reservation-fee-amount"
                    name="reservationFeeAmount"
                    type="number"
                    inputMode="decimal"
                    min={0.01}
                    max={100}
                    step={0.01}
                    value={feeAmount}
                    onChange={(event) => setFeeAmount(event.target.value)}
                    placeholder="30"
                    className="pr-8 tabular-nums"
                    required
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink/45">
                    %
                  </span>
                </div>
              )}
            </div>
          ) : null}
        </FormSection>

        <FormSection
          title="Late check-out"
          description="Let guests stay extra hours on their check-out day, when the extra time plus turnover ends before the next arrival."
        >
          <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-pine/12 bg-paper/50 p-4">
            <span className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-pine-mist text-pine">
                <Clock className="h-5 w-5" aria-hidden />
              </span>
              <span>
                <span className="block text-sm font-medium text-pine">
                  Allow late check-out
                </span>
                <span className="block text-xs text-ink/55">
                  Charged by the hour.
                </span>
              </span>
            </span>
            <span className="relative inline-flex shrink-0">
              <input
                type="checkbox"
                name="extensionsEnabled"
                role="switch"
                checked={lateOn}
                onChange={(event) => setLateOn(event.target.checked)}
                className="peer sr-only"
              />
              <span className="h-6 w-11 rounded-full bg-pine/20 transition-colors peer-checked:bg-moss peer-focus-visible:ring-2 peer-focus-visible:ring-clay" />
              <span className="pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
            </span>
          </label>
          {lateOn ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="unit-max-extension">
                  Most extra hours per stay
                </Label>
                <NumberStepper
                  id="unit-max-extension"
                  name="maxExtensionHours"
                  min={1}
                  max={12}
                  defaultValue={values.maxExtensionHours}
                  required
                />
              </div>
              <div>
                <Label htmlFor="unit-extension-rate">
                  Hourly rate{" "}
                  <span className="font-normal text-ink/45">(optional)</span>
                </Label>
                <PesoInput
                  id="unit-extension-rate"
                  name="extensionHourlyRate"
                  defaultValue={values.extensionHourlyRate}
                  placeholder="Auto"
                />
                <p className="mt-1 text-xs text-ink/55">
                  Leave empty to charge the stay’s accommodation total ÷ its
                  length in hours.
                </p>
              </div>
            </div>
          ) : (
            <>
              <input
                type="hidden"
                name="maxExtensionHours"
                value={values.maxExtensionHours}
              />
              <input
                type="hidden"
                name="extensionHourlyRate"
                value={values.extensionHourlyRate}
              />
            </>
          )}
        </FormSection>
      </FormLayout>
    </form>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-ink/60">{label}</dt>
      <dd className="font-medium tabular-nums text-pine">{value}</dd>
    </div>
  );
}

function FeeCard({
  icon: Icon,
  title,
  hint,
  htmlFor,
  children,
}: {
  icon: typeof CalendarDays;
  title: string;
  hint: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-pine/12 bg-paper/50 p-4">
      <div className="mb-3 flex items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-pine-mist text-pine">
          <Icon className="h-[18px] w-[18px]" aria-hidden />
        </span>
        <div className="min-w-0">
          <Label htmlFor={htmlFor} className="mb-0">
            {title} <span className="font-normal text-ink/45">(optional)</span>
          </Label>
          <p className="text-xs text-ink/55">{hint}</p>
        </div>
      </div>
      {children}
    </div>
  );
}
