"use client";

import { useState } from "react";
import { Check, Copy } from "@/components/ui/icons";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import { Input, Label, Textarea } from "@/components/ui/input";
import { addDaysLocal, nightsBetween, readableDate } from "@/lib/dates";
import { formatPHP } from "@/lib/money";
import { accommodationLines } from "@/lib/rates";
import {
  NumberField,
  ResultsCard,
  Section,
  ToolLayout,
  useFields,
} from "../tool-kit";

function clock(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  if (hours === undefined || minutes === undefined || Number.isNaN(hours))
    return time;
  const suffix = hours >= 12 ? "PM" : "AM";
  return `${hours % 12 || 12}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

const cents = (pesos: number) => Math.round(pesos * 100);

export function QuoteTool() {
  const { draft, set, num } = useFields({
    guest: "",
    unit: "",
    guests: "",
    rate: "",
    weekendRate: "",
    cleaning: "",
    deposit: "",
    downPayment: "50",
    checkInTime: "15:00",
    checkOutTime: "11:00",
    notes: "",
  });
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [copied, setCopied] = useState(false);
  const nights = checkIn && checkOut ? nightsBetween(checkIn, checkOut) : 0;

  const quote = (() => {
    if (nights < 1 || num("rate") <= 0) return null;
    const weekend = num("weekendRate");
    const lines = accommodationLines({
      checkIn,
      nights,
      baseCents: cents(num("rate")),
      dayRates:
        weekend > 0 ? { "5": cents(weekend), "6": cents(weekend) } : null,
    });
    const stay = lines.reduce(
      (sum, line) => sum + line.quantity * line.unitAmountCents,
      0,
    );
    const total = stay + cents(num("cleaning"));
    const down = Math.round((total * Math.min(num("downPayment"), 100)) / 100);
    return { lines, total, down, balance: total - down };
  })();

  const text = (() => {
    if (!quote) return "";
    const out: string[] = [];
    out.push(
      `Hi${draft.guest.trim() ? ` ${draft.guest.trim()}` : ""}! Here is your quote${draft.unit.trim() ? ` for ${draft.unit.trim()}` : ""}:`,
    );
    out.push("");
    out.push(
      `Check-in: ${readableDate(checkIn)} (from ${clock(draft.checkInTime)})`,
    );
    out.push(
      `Check-out: ${readableDate(checkOut)} (by ${clock(draft.checkOutTime)})`,
    );
    out.push(
      `${nights} ${nights === 1 ? "night" : "nights"}${num("guests") > 0 ? ` · ${num("guests")} ${num("guests") === 1 ? "guest" : "guests"}` : ""}`,
    );
    out.push("");
    for (const line of quote.lines)
      out.push(
        `${line.description}: ${line.quantity} × ${formatPHP(line.unitAmountCents)} = ${formatPHP(line.quantity * line.unitAmountCents)}`,
      );
    if (num("cleaning") > 0)
      out.push(`Cleaning fee: ${formatPHP(cents(num("cleaning")))}`);
    out.push(`Total: ${formatPHP(quote.total)}`);
    if (num("downPayment") > 0 && num("downPayment") < 100) {
      out.push("");
      out.push(
        `To confirm your booking, please send a ${num("downPayment")}% down payment of ${formatPHP(quote.down)}. The balance of ${formatPHP(quote.balance)} is due before check-in.`,
      );
    }
    if (num("deposit") > 0) {
      out.push("");
      out.push(
        `Refundable security deposit: ${formatPHP(cents(num("deposit")))}, returned after check-out if there is no damage.`,
      );
    }
    if (draft.notes.trim()) {
      out.push("");
      out.push(draft.notes.trim());
    }
    return out.join("\n");
  })();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy", {
        description: "Select the text and copy it yourself.",
      });
    }
  };

  return (
    <ToolLayout
      inputs={
        <>
          <Section title="The stay">
            <div>
              <Label htmlFor="quote-in">Check-in</Label>
              <DateInput
                id="quote-in"
                value={checkIn}
                onChange={(date) => {
                  setCheckIn(date);
                  if (!checkOut || checkOut <= date)
                    setCheckOut(addDaysLocal(date, 1));
                }}
              />
            </div>
            <div>
              <Label htmlFor="quote-out">Check-out</Label>
              <DateInput
                id="quote-out"
                value={checkOut}
                min={checkIn ? addDaysLocal(checkIn, 1) : undefined}
                onChange={setCheckOut}
              />
            </div>
            <div>
              <Label htmlFor="quote-guest">Guest name</Label>
              <Input
                id="quote-guest"
                value={draft.guest}
                onChange={(event) => set("guest")(event.target.value)}
                placeholder="Optional"
              />
            </div>
            <div>
              <Label htmlFor="quote-unit">Unit</Label>
              <Input
                id="quote-unit"
                value={draft.unit}
                onChange={(event) => set("unit")(event.target.value)}
                placeholder="e.g. Unit 14I"
              />
            </div>
            <NumberField
              id="quote-guests"
              label="Number of guests"
              unit="guests"
              value={draft.guests}
              onChange={set("guests")}
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="quote-ci-time">Check-in time</Label>
                <Input
                  id="quote-ci-time"
                  type="time"
                  value={draft.checkInTime}
                  onChange={(event) => set("checkInTime")(event.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="quote-co-time">Check-out time</Label>
                <Input
                  id="quote-co-time"
                  type="time"
                  value={draft.checkOutTime}
                  onChange={(event) => set("checkOutTime")(event.target.value)}
                />
              </div>
            </div>
          </Section>

          <Section title="The price">
            <NumberField
              id="quote-rate"
              label="Nightly rate"
              unit="₱"
              value={draft.rate}
              onChange={set("rate")}
            />
            <NumberField
              id="quote-weekend"
              label="Friday and Saturday rate"
              info="Optional. Leave empty if every night costs the same."
              unit="₱"
              value={draft.weekendRate}
              onChange={set("weekendRate")}
            />
            <NumberField
              id="quote-cleaning"
              label="Cleaning fee"
              unit="₱"
              value={draft.cleaning}
              onChange={set("cleaning")}
            />
            <NumberField
              id="quote-deposit"
              label="Refundable security deposit"
              unit="₱"
              value={draft.deposit}
              onChange={set("deposit")}
            />
            <NumberField
              id="quote-down"
              label="Down payment to confirm"
              info="Share of the total the guest sends to hold the dates. Use 100 to ask for the full amount, or 0 to leave it out."
              unit="%"
              value={draft.downPayment}
              onChange={set("downPayment")}
            />
            <div className="sm:col-span-2">
              <Label htmlFor="quote-notes">Extra note</Label>
              <Textarea
                id="quote-notes"
                value={draft.notes}
                onChange={(event) => set("notes")(event.target.value)}
                placeholder="e.g. Payment details, parking, early check-in rules"
                className="min-h-20"
              />
            </div>
          </Section>
        </>
      }
      results={
        <ResultsCard title="Your quote">
          {!quote ? (
            <p className="py-8 text-center text-sm text-ink/60">
              Pick the dates and enter a nightly rate and the message is written
              for you.
            </p>
          ) : (
            <>
              <div>
                <p className="text-sm text-ink/60">Total</p>
                <p className="mt-1 font-display text-4xl text-pine">
                  {formatPHP(quote.total)}
                </p>
              </div>
              <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-lg border border-pine/12 bg-surface p-3 font-sans text-sm leading-relaxed text-ink">
                {text}
              </pre>
              <Button type="button" variant="primary" onClick={copy}>
                {copied ? (
                  <Check className="h-4 w-4" aria-hidden />
                ) : (
                  <Copy className="h-4 w-4" aria-hidden />
                )}
                {copied ? "Copied" : "Copy message"}
              </Button>
            </>
          )}
        </ResultsCard>
      }
    />
  );
}
