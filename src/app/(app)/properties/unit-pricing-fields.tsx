"use client";

import { useState } from "react";
import { Input, Label } from "@/components/ui/input";
import { TimeInput } from "@/components/ui/time-input";
import { fromMinutes, stayLengthHours, toMinutes } from "@/lib/stay-times";
import { cn } from "@/lib/utils";

const STAY_LENGTHS = [12, 18, 20, 22, 23, 24];

/**
 * Check-in, stay length and check-out, kept in step: changing the check-in
 * or the length fills in check-out; editing check-out updates the length.
 * Stays are overnight, so check-out lands on the next day.
 */
export function StayTimesFields({
  defaultCheckIn,
  defaultCheckOut,
}: {
  defaultCheckIn: string;
  defaultCheckOut: string;
}) {
  const [checkIn, setCheckIn] = useState(defaultCheckIn);
  const [checkOut, setCheckOut] = useState(defaultCheckOut);
  const [hoursInput, setHoursInput] = useState(
    String(stayLengthHours(defaultCheckIn, defaultCheckOut) ?? ""),
  );
  const hours = stayLengthHours(checkIn, checkOut);

  const applyLength = (value: string, from = checkIn) => {
    setHoursInput(value);
    const length = Number(value);
    const start = toMinutes(from);
    if (start !== null && length > 0 && length <= 24)
      setCheckOut(fromMinutes(start + length * 60));
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="unit-check-in">Check-in from</Label>
          <TimeInput
            id="unit-check-in"
            name="checkInTime"
            value={checkIn}
            onChange={(time) => {
              setCheckIn(time);
              applyLength(hoursInput, time);
            }}
            required
          />
        </div>
        <div>
          <Label htmlFor="unit-stay-length">Stay length</Label>
          <div className="relative">
            <Input
              id="unit-stay-length"
              type="number"
              min={1}
              max={24}
              step={0.5}
              value={hoursInput}
              onChange={(event) => applyLength(event.target.value)}
              className="pr-14"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink/45">
              hours
            </span>
          </div>
        </div>
        <div>
          <Label htmlFor="unit-check-out">Check-out by</Label>
          <TimeInput
            id="unit-check-out"
            name="checkOutTime"
            value={checkOut}
            onChange={(time) => {
              setCheckOut(time);
              const length = stayLengthHours(checkIn, time);
              if (length !== null) setHoursInput(String(length));
            }}
            required
          />
          <p className="mt-1.5 text-xs text-ink/50">The next day</p>
        </div>
      </div>
      <div
        className="flex flex-wrap items-center gap-2"
        role="group"
        aria-label="Common stay lengths"
      >
        <span className="text-xs text-ink/50">Quick pick:</span>
        {STAY_LENGTHS.map((length) => (
          <button
            key={length}
            type="button"
            onClick={() => applyLength(String(length))}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              hours === length
                ? "border-primary bg-primary text-white"
                : "border-pine/15 text-pine hover:border-pine/35",
            )}
          >
            {length}h
          </button>
        ))}
      </div>
    </div>
  );
}
