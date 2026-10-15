"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Label, Select } from "@/components/ui/input";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { monthNightRange, nightsBetween, shiftMonth } from "@/lib/dates";
import { formatPHP } from "@/lib/money";
import {
  estimateRevenue,
  previewNights,
  type PreviewNight,
  type PricedUnit,
  type PricingRuleLike,
} from "@/lib/pricing-rules";
import { cn } from "@/lib/utils";

export interface PreviewUnit extends PricedUnit {
  name: string;
  propertyName: string;
}

const ALL = "all";
const MONTH_LABEL = new Intl.DateTimeFormat("en-PH", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const WEEKDAY_HEADS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Whole pesos for a calendar cell; the cents only matter in the totals. */
function pesos(cents: number) {
  return formatPHP(Math.round(cents / 100) * 100);
}

/**
 * Shows what the rules do: the nightly price for every night of a month, and
 * the revenue that month would bring at an assumed occupancy. Works on
 * whatever rules it is given, so the rule form can preview an unsaved draft.
 */
export function PricePreview({
  units,
  rules,
  today,
  initialUnitId,
  title = "Price preview",
}: {
  units: PreviewUnit[];
  rules: PricingRuleLike[];
  /** Today's date (YYYY-MM-DD); decides the first month shown. */
  today: string;
  initialUnitId?: string;
  title?: string;
}) {
  const [unitId, setUnitId] = useState(
    initialUnitId && units.some((unit) => unit.id === initialUnitId)
      ? initialUnitId
      : (units[0]?.id ?? ALL),
  );
  const [month, setMonth] = useState(today.slice(0, 7));
  const [occupancy, setOccupancy] = useState(70);

  const { nightsByUnit, days } = useMemo(() => {
    const range = monthNightRange(month);
    const count = nightsBetween(range.start, range.end);
    const selected =
      unitId === ALL ? units : units.filter((u) => u.id === unitId);
    return {
      days: count,
      nightsByUnit: selected.map((unit) => ({
        unit,
        nights: previewNights(unit, rules, range.start, count),
      })),
    };
  }, [month, unitId, units, rules]);

  const allNights = nightsByUnit.flatMap((entry) => entry.nights);
  const estimate = estimateRevenue(allNights, occupancy);
  const difference = estimate.expectedCents - estimate.expectedBaseCents;

  // The calendar shows one price per day: the unit's, or the average across units.
  const perDay: PreviewNight[] = Array.from({ length: days }, (_, index) => {
    const entries = nightsByUnit.map((entry) => entry.nights[index]!);
    const first = entries[0];
    if (!first) return { date: "", baseCents: 0, cents: 0, applied: [] };
    const average = (pick: (night: PreviewNight) => number) =>
      Math.round(entries.reduce((sum, n) => sum + pick(n), 0) / entries.length);
    return {
      date: first.date,
      baseCents: average((n) => n.baseCents),
      cents: average((n) => n.cents),
      applied: entries.length === 1 ? first.applied : [],
    };
  });
  const leading = perDay[0]
    ? new Date(`${perDay[0].date}T00:00:00Z`).getUTCDay()
    : 0;

  return (
    <Card className="bg-card">
      <CardHeader className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl text-pine">{title}</h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => setMonth((value) => shiftMonth(value, -1))}
            className="rounded-lg p-2 text-pine hover:bg-pine-mist/70"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <span className="min-w-40 text-center text-base font-medium text-ink">
            {MONTH_LABEL.format(new Date(`${month}-01T00:00:00Z`))}
          </span>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => setMonth((value) => shiftMonth(value, 1))}
            className="rounded-lg p-2 text-pine hover:bg-pine-mist/70"
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </CardHeader>
      <CardBody className="space-y-5">
        {units.length === 0 ? (
          <p className="text-sm text-ink/60">
            Add a unit to see what these rules do to its prices.
          </p>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="preview-unit">Unit</Label>
                <Select
                  id="preview-unit"
                  value={unitId}
                  onChange={(event) => setUnitId(event.target.value)}
                >
                  {units.length > 1 ? (
                    <option value={ALL}>All units (average price)</option>
                  ) : null}
                  {units.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.propertyName} · {unit.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="preview-occupancy">
                  Assumed occupancy:{" "}
                  <span className="font-semibold text-pine">{occupancy}%</span>
                </Label>
                <input
                  id="preview-occupancy"
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={occupancy}
                  onChange={(event) => setOccupancy(Number(event.target.value))}
                  className="mt-3 w-full accent-pine"
                />
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              <Stat
                label="Expected revenue"
                value={formatPHP(estimate.expectedCents)}
                note={
                  difference === 0
                    ? "Same as without rules"
                    : `${difference > 0 ? "+" : "−"}${formatPHP(Math.abs(difference))} vs base rates`
                }
                tone={difference > 0 ? "up" : difference < 0 ? "down" : "flat"}
              />
              <Stat
                label="If fully booked"
                value={formatPHP(estimate.fullCents)}
                note={`${formatPHP(estimate.fullBaseCents)} at base rates`}
              />
              <Stat
                label="Average per night"
                value={formatPHP(estimate.averageCents)}
                note={`${formatPHP(estimate.lowestCents)} – ${formatPHP(estimate.highestCents)}`}
              />
              <Stat
                label="Nights changed"
                value={`${estimate.changedNights} of ${estimate.nights}`}
                note="priced differently by a rule"
              />
            </dl>

            <div>
              <div className="grid grid-cols-7 gap-1.5 text-center text-sm font-medium text-ink/55">
                {WEEKDAY_HEADS.map((day) => (
                  <span key={day}>{day}</span>
                ))}
              </div>
              <div className="mt-1.5 grid grid-cols-7 gap-1.5">
                {Array.from({ length: leading }, (_, index) => (
                  <span key={`pad-${index}`} />
                ))}
                {perDay.map((night) => {
                  const changed = night.cents !== night.baseCents;
                  const raised = night.cents > night.baseCents;
                  return (
                    <div
                      key={night.date}
                      title={
                        night.applied.length
                          ? night.applied.map((rule) => rule.name).join(" + ")
                          : changed
                            ? "Changed by rules"
                            : "Regular rate"
                      }
                      className={cn(
                        "flex min-h-16 flex-col items-center justify-center rounded-lg border px-1 py-2 text-center sm:min-h-20",
                        changed
                          ? raised
                            ? "border-clay/30 bg-clay-mist"
                            : "border-pine/25 bg-sage/60"
                          : "border-pine/10 bg-surface",
                      )}
                    >
                      <div className="text-xs leading-none text-ink/55 sm:text-sm">
                        {Number(night.date.slice(8))}
                      </div>
                      <div className="mt-1.5 text-sm font-semibold leading-none text-ink sm:text-base">
                        {pesos(night.cents)}
                      </div>
                      {changed ? (
                        <div className="mt-1 hidden text-xs leading-none text-ink/50 line-through sm:block">
                          {pesos(night.baseCents)}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
              <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink/60">
                <Legend
                  className="border-clay/30 bg-clay-mist"
                  label="Raised"
                />
                <Legend className="border-pine/25 bg-sage/60" label="Lowered" />
                <Legend
                  className="border-pine/10 bg-surface"
                  label="Regular rate"
                />
                <span>
                  Prices are for nights starting that day, before cleaning fees.
                  Hover a day to see which rules apply.
                </span>
              </p>
            </div>
          </>
        )}
      </CardBody>
    </Card>
  );
}

function Stat({
  label,
  value,
  note,
  tone = "flat",
}: {
  label: string;
  value: string;
  note: string;
  tone?: "up" | "down" | "flat";
}) {
  return (
    <div className="rounded-lg border border-pine/10 bg-surface px-3 py-2.5">
      <dt className="text-sm text-ink/60">{label}</dt>
      <dd className="mt-1 font-display text-2xl text-pine">{value}</dd>
      <p
        className={cn(
          "text-sm",
          tone === "up"
            ? "text-pine"
            : tone === "down"
              ? "text-clay-deep"
              : "text-ink/50",
        )}
      >
        {note}
      </p>
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("h-3 w-3 rounded border", className)} />
      {label}
    </span>
  );
}
