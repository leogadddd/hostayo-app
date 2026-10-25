"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Funnel as Filter } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const LEGEND = "mb-2.5 block text-sm font-semibold text-pine";
const MANILA_DAY = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "Asia/Manila",
});

function iso(date: Date) {
  return date.toISOString().slice(0, 10);
}

/** Quick check-in ranges, worked out from today in Manila. */
function presets() {
  const today = MANILA_DAY.format(new Date());
  const [year, month, day] = today.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  return [
    {
      label: "This month",
      start: iso(new Date(Date.UTC(year, month - 1, 1))),
      end: iso(new Date(Date.UTC(year, month, 0))),
    },
    {
      label: "Next month",
      start: iso(new Date(Date.UTC(year, month, 1))),
      end: iso(new Date(Date.UTC(year, month + 1, 0))),
    },
    {
      label: "Next 30 days",
      start: today,
      end: iso(new Date(Date.UTC(year, month - 1, day + 30))),
    },
  ];
}

/** Adds the id to the selection, or removes it. */
function toggle(list: string[], id: string) {
  return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
}

/** A chip that switches on and off, for choosing several options at once. */
function ToggleChip({
  pressed,
  onToggle,
  children,
}: {
  pressed: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onToggle}
      className={cn(
        "inline-flex h-11 items-center gap-1.5 rounded-full px-4 text-sm font-semibold ring-1 transition-colors",
        pressed
          ? "bg-primary text-white ring-primary"
          : "bg-surface text-pine ring-pine/12 active:bg-pine-mist",
      )}
    >
      {children}
    </button>
  );
}

/** One option in a single-choice group, drawn as a chip over a hidden radio. */
function ChoiceChip({
  name,
  value,
  checked,
  children,
}: {
  name: string;
  value: string;
  checked: boolean;
  children: ReactNode;
}) {
  return (
    <label className="cursor-pointer">
      <input
        type="radio"
        name={name}
        value={value}
        defaultChecked={checked}
        className="peer sr-only"
      />
      <span className="inline-flex h-11 items-center rounded-full bg-surface px-4 text-sm font-semibold text-pine ring-1 ring-pine/12 transition-colors active:bg-pine-mist peer-checked:bg-primary peer-checked:text-white peer-checked:ring-primary peer-focus-visible:outline-2 peer-focus-visible:outline-clay">
        {children}
      </span>
    </label>
  );
}

/**
 * Filters for the phone reservations list, in a bottom sheet. Every option is
 * a chip. Submits as a GET so each filter lives in the URL.
 */
export function MobileFilters({
  query,
  status,
  unitIds,
  platformIds,
  startDate,
  endDate,
  sort,
  units,
  platforms,
}: {
  query?: string;
  status?: string;
  unitIds: string[];
  platformIds: string[];
  startDate?: string;
  endDate?: string;
  sort: "checkin" | "booked";
  units: Array<{ id: string; name: string }>;
  platforms: Array<{ id: string; name: string; isActive: boolean }>;
}) {
  const [open, setOpen] = useState(false);
  // The date inputs are controlled so a preset chip can fill them.
  const [start, setStart] = useState(startDate ?? "");
  const [end, setEnd] = useState(endDate ?? "");
  // Units and platforms allow several at once; none selected means "all".
  const [unitSel, setUnitSel] = useState(unitIds);
  const [platformSel, setPlatformSel] = useState(platformIds);
  const openSheet = () => {
    // Start from what is applied, dropping any edits that were never applied.
    setStart(startDate ?? "");
    setEnd(endDate ?? "");
    setUnitSel(unitIds);
    setPlatformSel(platformIds);
    setOpen(true);
  };
  const activeCount =
    Number(unitIds.length > 0) +
    Number(platformIds.length > 0) +
    Number(Boolean(startDate)) +
    Number(Boolean(endDate)) +
    Number(sort === "booked");
  const keep = new URLSearchParams({
    ...(query ? { q: query } : {}),
    ...(status ? { status } : {}),
  }).toString();
  const clearHref = keep ? `/reservations?${keep}` : "/reservations";
  const formId = "mobile-reservation-filters";

  return (
    <>
      <button
        type="button"
        onClick={openSheet}
        aria-haspopup="dialog"
        className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-surface px-4 text-sm font-semibold text-pine shadow-[0_2px_10px_rgba(32,58,53,0.08)] ring-1 ring-pine/8 active:bg-pine-mist"
      >
        <Filter className="h-4 w-4" aria-hidden />
        Filters
        {activeCount ? (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-clay px-1.5 text-[11px] font-bold leading-none text-white">
            {activeCount}
          </span>
        ) : null}
      </button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Filters"
        footer={
          <div className="flex items-center gap-3">
            <Link
              href={clearHref}
              onClick={() => setOpen(false)}
              className="inline-flex h-12 items-center justify-center rounded-xl px-5 text-sm font-semibold text-clay-deep active:bg-clay-mist"
            >
              Clear
            </Link>
            <Button
              type="submit"
              form={formId}
              variant="primary"
              size="lg"
              className="h-12 flex-1"
            >
              Apply filters
            </Button>
          </div>
        }
      >
        <form id={formId} method="get" className="space-y-6 pt-2">
          {query ? <input type="hidden" name="q" value={query} /> : null}
          {status ? <input type="hidden" name="status" value={status} /> : null}

          <fieldset>
            <legend className={LEGEND}>Unit</legend>
            {unitSel.map((id) => (
              <input key={id} type="hidden" name="unit" value={id} />
            ))}
            <div className="flex flex-wrap gap-2">
              <ToggleChip
                pressed={unitSel.length === 0}
                onToggle={() => setUnitSel([])}
              >
                All units
              </ToggleChip>
              {units.map((unit) => (
                <ToggleChip
                  key={unit.id}
                  pressed={unitSel.includes(unit.id)}
                  onToggle={() => setUnitSel((list) => toggle(list, unit.id))}
                >
                  {unit.name}
                </ToggleChip>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className={LEGEND}>Booked through</legend>
            {platformSel.map((id) => (
              <input key={id} type="hidden" name="platform" value={id} />
            ))}
            <div className="flex flex-wrap gap-2">
              <ToggleChip
                pressed={platformSel.length === 0}
                onToggle={() => setPlatformSel([])}
              >
                All platforms
              </ToggleChip>
              {platforms.map((platform) => (
                <ToggleChip
                  key={platform.id}
                  pressed={platformSel.includes(platform.id)}
                  onToggle={() =>
                    setPlatformSel((list) => toggle(list, platform.id))
                  }
                >
                  {platform.name}
                  {platform.isActive ? "" : " (retired)"}
                </ToggleChip>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className={LEGEND}>Check-in dates</legend>
            <div className="mb-3 flex flex-wrap gap-2">
              {presets().map((preset) => {
                const selected = start === preset.start && end === preset.end;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      setStart(preset.start);
                      setEnd(preset.end);
                    }}
                    className={cn(
                      "inline-flex h-11 items-center rounded-full px-4 text-sm font-semibold ring-1 transition-colors",
                      selected
                        ? "bg-primary text-white ring-primary"
                        : "bg-surface text-pine ring-pine/12 active:bg-pine-mist",
                    )}
                  >
                    {preset.label}
                  </button>
                );
              })}
              {start || end ? (
                <button
                  type="button"
                  onClick={() => {
                    setStart("");
                    setEnd("");
                  }}
                  className="inline-flex h-11 items-center rounded-full px-3 text-sm font-semibold text-clay-deep active:opacity-70"
                >
                  Any date
                </button>
              ) : null}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="m-filter-start"
                  className="mb-1.5 block text-xs font-medium text-ink/60"
                >
                  From
                </label>
                <Input
                  id="m-filter-start"
                  name="start"
                  type="date"
                  value={start}
                  onChange={(event) => setStart(event.target.value)}
                  className="h-12 text-base"
                />
              </div>
              <div>
                <label
                  htmlFor="m-filter-end"
                  className="mb-1.5 block text-xs font-medium text-ink/60"
                >
                  Until
                </label>
                <Input
                  id="m-filter-end"
                  name="end"
                  type="date"
                  value={end}
                  min={start || undefined}
                  onChange={(event) => setEnd(event.target.value)}
                  className="h-12 text-base"
                />
              </div>
            </div>
          </fieldset>

          <fieldset>
            <legend className={LEGEND}>Sort by</legend>
            <div className="flex flex-wrap gap-2">
              <ChoiceChip
                name="sort"
                value="checkin"
                checked={sort === "checkin"}
              >
                Check-in date
              </ChoiceChip>
              <ChoiceChip
                name="sort"
                value="booked"
                checked={sort === "booked"}
              >
                Date booked
              </ChoiceChip>
            </div>
          </fieldset>
        </form>
      </Sheet>
    </>
  );
}
