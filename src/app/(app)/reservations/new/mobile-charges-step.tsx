"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowCounterClockwise as RotateCcw,
  Money as Banknote,
  Plus,
  Receipt,
  ShieldCheck,
  Trash as Trash2,
} from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { TimeInput } from "@/components/ui/time-input";
import { PAYMENT_ALLOCATION_LABELS } from "@/lib/labels";
import { formatPHP } from "@/lib/money";
import { describeReservationFee } from "@/lib/reservation-fee";
import { cn } from "@/lib/utils";
import {
  ChipGroup,
  FIELD,
  FieldLabel,
  FormCard,
  Stepper,
  SwitchRow,
} from "./mobile-form-ui";
import {
  CHARGE_TYPE_OPTIONS,
  PAYMENT_METHOD_OPTIONS,
  type ChargeDraft,
  type ReservationDraft,
} from "./reservation-draft";

function ChargeEditor({
  draft,
  charge,
  onClose,
}: {
  draft: ReservationDraft;
  charge: ChargeDraft | undefined;
  onClose: () => void;
}) {
  const { updateCharge, changeChargeType, setCustomCharges, defaultCharges } =
    draft;
  if (!charge) return null;
  const quantity = Number(charge.quantity);
  return (
    <div className="space-y-5 pb-2 pt-1">
      <div>
        <FieldLabel>Type</FieldLabel>
        <ChipGroup
          label="Charge type"
          value={charge.type}
          onChange={(type) => changeChargeType(charge, type)}
          options={CHARGE_TYPE_OPTIONS.map((option) => {
            const Icon = option.icon;
            return {
              value: option.value,
              label: option.label,
              leading: Icon ? (
                <Icon className="h-4 w-4" aria-hidden />
              ) : undefined,
            };
          })}
        />
      </div>
      <div>
        <FieldLabel htmlFor="m-charge-description">Description</FieldLabel>
        <Input
          id="m-charge-description"
          value={charge.description}
          onChange={(event) =>
            updateCharge(charge.key, { description: event.target.value })
          }
          placeholder={
            charge.type === "accommodation"
              ? "Accommodation (3 nights)"
              : "Describe the charge"
          }
          className={FIELD}
        />
      </div>
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-end gap-5">
        <div>
          <FieldLabel>Quantity</FieldLabel>
          <Stepper
            label="Quantity"
            value={Number.isInteger(quantity) && quantity >= 1 ? quantity : 1}
            onChange={(value) =>
              updateCharge(charge.key, { quantity: String(value) })
            }
            max={999}
          />
        </div>
        <div>
          <FieldLabel htmlFor="m-charge-amount">
            {charge.type === "discount" ? "Amount (₱, negative)" : "Amount (₱)"}
          </FieldLabel>
          <Input
            id="m-charge-amount"
            value={charge.amountInput}
            inputMode="decimal"
            placeholder="5500"
            onChange={(event) =>
              updateCharge(charge.key, { amountInput: event.target.value })
            }
            className={FIELD}
          />
        </div>
      </div>
      <Button
        type="button"
        variant="ghost"
        className="h-12 w-full rounded-2xl bg-clay-mist/60 text-clay-deep hover:bg-clay-mist"
        onClick={() => {
          setCustomCharges((current) =>
            (current ?? defaultCharges).filter(
              (item) => item.key !== charge.key,
            ),
          );
          onClose();
        }}
      >
        <Trash2 className="h-4 w-4" aria-hidden />
        Remove this charge
      </Button>
    </div>
  );
}

/** Step 3 on a phone: the charge lines as tappable rows, then any payment received. */
export function MobileChargesStep({ draft }: { draft: ReservationDraft }) {
  const {
    parsed,
    totals,
    customCharges,
    setCustomCharges,
    defaultCharges,
    edit,
    feeCents,
    feeRule,
    feeCovered,
    noPayment,
    setNoPayment,
    payment,
    setPayment,
    receivedNow,
    setReceivedNow,
    today,
  } = draft;
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const editing = parsed.find((entry) => entry.draft.key === editingKey);

  function addCharge() {
    const key = crypto.randomUUID();
    setCustomCharges((current) => [
      ...(current ?? defaultCharges),
      { key, type: "fee", description: "", quantity: "1", amountInput: "" },
    ]);
    setEditingKey(key);
  }

  return (
    <div className="space-y-3">
      <section className="rounded-3xl bg-primary p-5 text-white shadow-[0_14px_32px_rgba(32,58,53,0.3)]">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/60">
          Booking total
        </p>
        <p className="mt-1 font-display text-[2rem] leading-tight tabular-nums">
          {formatPHP(totals.bookingTotalCents)}
        </p>
        {totals.depositTotalCents ? (
          <p className="mt-1 text-sm text-white/70">
            + {formatPHP(totals.depositTotalCents)} refundable deposit
          </p>
        ) : null}
      </section>

      <FormCard
        title="Charges"
        hint={
          edit
            ? "This reservation’s current charges. Tap one to change it."
            : "Built from the unit’s rates. Tap a line to change the price."
        }
        action={
          customCharges !== null ? (
            <button
              type="button"
              onClick={() => setCustomCharges(null)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-pine-mist px-3 py-2 text-xs font-semibold text-pine active:bg-pine/15"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              Reset
            </button>
          ) : null
        }
      >
        <ul className="space-y-2">
          {parsed.map(({ draft: charge, line }) => {
            const quantity = Number(charge.quantity);
            const subtotal =
              line && Number.isInteger(quantity) && quantity >= 1
                ? line.quantity * line.unitAmountCents
                : null;
            return (
              <li key={charge.key}>
                <button
                  type="button"
                  onClick={() => setEditingKey(charge.key)}
                  aria-haspopup="dialog"
                  className={cn(
                    "flex w-full items-center gap-3 rounded-2xl p-3.5 text-left ring-1 transition active:bg-pine-mist",
                    line
                      ? "bg-surface ring-pine/12"
                      : "bg-clay-mist/40 ring-clay/40",
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block truncate text-[15px] font-semibold",
                        line ? "text-pine" : "text-clay-deep",
                      )}
                    >
                      {charge.description.trim() || "Add a description"}
                    </span>
                    <span className="mt-0.5 block text-xs text-ink/55">
                      {charge.quantity || "1"} ×{" "}
                      {line ? formatPHP(line.unitAmountCents) : "—"}
                    </span>
                  </span>
                  <span className="shrink-0 text-base font-semibold tabular-nums text-pine">
                    {subtotal === null ? "—" : formatPHP(subtotal)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <Button
          type="button"
          variant="outline"
          className="mt-3 h-12 w-full rounded-2xl"
          onClick={addCharge}
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add charge
        </Button>
      </FormCard>

      {edit ? (
        <FormCard
          title="Payments"
          hint="Payments are ledger entries and don’t change here."
        >
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink/60">Paid so far</dt>
              <dd className="font-semibold tabular-nums text-pine">
                {formatPHP(edit.paid.bookingCents)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink/60">Still due after this edit</dt>
              <dd className="font-semibold tabular-nums text-clay-deep">
                {formatPHP(
                  Math.max(
                    0,
                    totals.bookingTotalCents - edit.paid.bookingCents,
                  ),
                )}
              </dd>
            </div>
          </dl>
          <Link
            href={`/reservations/${edit.reservationId}/payments/new`}
            className="mt-4 flex h-12 items-center justify-center gap-2 rounded-2xl text-sm font-semibold text-pine ring-1 ring-pine/20 active:bg-pine-mist"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Record payment
          </Link>
        </FormCard>
      ) : (
        <FormCard
          title="Payment received"
          hint="Optional. Recorded with a confirmed booking so the balance starts accurate."
        >
          {feeCents ? (
            <div className="mb-3.5 rounded-2xl border border-clay/30 bg-clay-mist/40 p-3.5 text-sm">
              <p className="font-semibold text-clay-deep">
                Reservation fee {formatPHP(feeCents)}
                {feeRule?.type === "percent" ? (
                  <span className="font-normal text-ink/55">
                    {" "}
                    ({describeReservationFee(feeRule)})
                  </span>
                ) : null}
              </p>
              <p className="mt-0.5 text-xs text-ink/60">
                Needed to confirm this booking. Place a hold until the guest
                pays it.
              </p>
              {!noPayment && !feeCovered ? (
                <Button
                  type="button"
                  variant="outline"
                  className="mt-3 h-11 rounded-full"
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

          <ChipGroup
            label="Payment"
            value={noPayment ? "none" : "record"}
            onChange={(value) => {
              const none = value === "none";
              setNoPayment(none);
              if (none) setPayment({ ...payment, amount: "" });
            }}
            options={[
              { value: "record", label: "Record a payment" },
              { value: "none", label: "No payment yet" },
            ]}
          />

          {noPayment ? (
            <p className="mt-3.5 rounded-2xl bg-linen px-4 py-3 text-sm text-ink/70">
              The booking total of{" "}
              <strong>{formatPHP(totals.bookingTotalCents)}</strong> stays due
              from the guest. Record payments from the reservation once they
              arrive.
            </p>
          ) : (
            <div className="mt-4 space-y-5">
              <div>
                <FieldLabel htmlFor="m-payment-amount">
                  Amount received (₱)
                </FieldLabel>
                <Input
                  id="m-payment-amount"
                  value={payment.amount}
                  onChange={(event) =>
                    setPayment({ ...payment, amount: event.target.value })
                  }
                  inputMode="decimal"
                  placeholder="e.g. 3,000"
                  className={FIELD}
                />
              </div>
              <div>
                <FieldLabel>Towards</FieldLabel>
                <ChipGroup
                  label="Towards"
                  value={payment.allocation}
                  onChange={(allocation) =>
                    setPayment({ ...payment, allocation })
                  }
                  options={[
                    {
                      value: "booking",
                      label: PAYMENT_ALLOCATION_LABELS.booking,
                      leading: <Receipt className="h-4 w-4" aria-hidden />,
                    },
                    {
                      value: "security_deposit",
                      label: PAYMENT_ALLOCATION_LABELS.security_deposit,
                      leading: <ShieldCheck className="h-4 w-4" aria-hidden />,
                      disabled:
                        !totals.depositTotalCents &&
                        payment.allocation !== "security_deposit",
                    },
                  ]}
                />
                {payment.allocation === "security_deposit" &&
                totals.depositTotalCents ? (
                  <p className="mt-2 text-xs text-ink/55">
                    Refundable {formatPHP(totals.depositTotalCents)}, returned
                    after checkout.
                  </p>
                ) : null}
              </div>
              <div>
                <FieldLabel>Method</FieldLabel>
                <ChipGroup
                  label="Method"
                  value={payment.method}
                  onChange={(method) => setPayment({ ...payment, method })}
                  options={PAYMENT_METHOD_OPTIONS.map((option) => {
                    const Icon = option.icon ?? Banknote;
                    return {
                      value: option.value,
                      label: option.label,
                      leading: <Icon className="h-4 w-4" aria-hidden />,
                    };
                  })}
                />
              </div>
              <div>
                <FieldLabel htmlFor="m-payment-reference" optional>
                  Reference
                </FieldLabel>
                <Input
                  id="m-payment-reference"
                  value={payment.reference}
                  onChange={(event) =>
                    setPayment({ ...payment, reference: event.target.value })
                  }
                  maxLength={120}
                  placeholder="GCash reference or sender"
                  className={FIELD}
                />
              </div>
              <SwitchRow
                label="Received just now"
                description="Turn off to enter when it arrived."
                checked={receivedNow}
                onChange={(checked) => {
                  setReceivedNow(checked);
                  if (!checked && !payment.receivedAt)
                    setPayment({ ...payment, receivedAt: `${today}T12:00` });
                }}
              />
              {!receivedNow ? (
                <div className="grid grid-cols-[minmax(0,1fr)_7.5rem] gap-2">
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
          )}
        </FormCard>
      )}

      <Sheet
        open={editing !== undefined}
        onClose={() => setEditingKey(null)}
        title="Edit charge"
        footer={
          <Button
            type="button"
            variant="primary"
            size="lg"
            className="h-12 w-full rounded-2xl"
            onClick={() => setEditingKey(null)}
          >
            Done
          </Button>
        }
      >
        <ChargeEditor
          draft={draft}
          charge={editing?.draft}
          onClose={() => setEditingKey(null)}
        />
      </Sheet>
    </div>
  );
}
