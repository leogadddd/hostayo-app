"use client";

import {
  Bed as BedDouble,
  CalendarBlank,
  Check,
  Users,
} from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import {
  dayLabel,
  plural,
  timeLabel,
  UnitPhoto,
} from "../../calendar/availability/stay-display";
import { FormCard, PickerRow, Stepper } from "./mobile-form-ui";
import type { ReservationDraft } from "./reservation-draft";
import { AvailabilityBanner } from "./reservation-form-parts";

/** Step 1 on a phone: pick the unit, the dates (in a drawer) and how many guests. */
export function MobileStayStep({
  draft,
  onPickDates,
}: {
  draft: ReservationDraft;
  onPickDates: () => void;
}) {
  const {
    units,
    unitId,
    setUnitId,
    setCustomCharges,
    selectedUnit,
    checkIn,
    checkOut,
    nights,
    validRange,
    guestCount,
    setGuestCount,
    capacity,
    currentAvailability,
    unchangedStay,
    edit,
  } = draft;

  return (
    <div className="space-y-3">
      {units.length > 1 ? (
        <FormCard title="Unit">
          <ul role="radiogroup" aria-label="Unit" className="space-y-2">
            {units.map((unit) => {
              const selected = unit.id === unitId;
              return (
                <li key={unit.id}>
                  <label
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-2xl p-2.5 ring-1 transition active:bg-pine-mist",
                      selected
                        ? "bg-clay-mist/40 ring-2 ring-clay/45"
                        : "bg-surface ring-pine/12",
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
                      className="h-14 w-14 shrink-0 rounded-xl"
                    />
                    <span className="min-w-0 flex-1">
                      {unit.propertyName ? (
                        <span className="block truncate text-[11px] font-semibold uppercase tracking-wide text-clay-deep">
                          {unit.propertyName}
                        </span>
                      ) : null}
                      <span className="block truncate text-[15px] font-semibold text-pine">
                        {unit.name}
                      </span>
                      <span className="mt-0.5 flex items-center gap-3 text-xs text-ink/60">
                        <span className="inline-flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" aria-hidden />
                          {unit.capacity}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <BedDouble className="h-3.5 w-3.5" aria-hidden />
                          {unit.bedrooms || "Studio"}
                        </span>
                      </span>
                    </span>
                    {selected ? (
                      <span className="mr-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-clay text-white">
                        <Check className="h-3.5 w-3.5" aria-hidden />
                      </span>
                    ) : null}
                  </label>
                </li>
              );
            })}
          </ul>
        </FormCard>
      ) : null}

      <FormCard title="Dates">
        <PickerRow
          icon={CalendarBlank}
          label="Check-in → check-out"
          value={
            validRange
              ? `${dayLabel(checkIn)} → ${dayLabel(checkOut)}`
              : "Choose your dates"
          }
          sub={
            validRange && selectedUnit
              ? `${plural(nights ?? 0, "night")} · in from ${timeLabel(selectedUnit.checkInTime)}, out by ${timeLabel(selectedUnit.checkOutTime)}`
              : undefined
          }
          invalid={!validRange}
          onClick={onPickDates}
        />
      </FormCard>

      <FormCard
        title="Guests"
        hint={`This unit sleeps ${capacity}.`}
        action={
          <Stepper
            label="Guests"
            value={guestCount}
            onChange={setGuestCount}
            max={capacity}
          />
        }
      >
        <p className="text-sm text-ink/60">
          {plural(guestCount, "guest")} staying
        </p>
      </FormCard>

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
  );
}
