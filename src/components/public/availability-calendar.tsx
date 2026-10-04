"use client";

import { useMemo, useState } from "react";
import { CalendarCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPHP } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { PublicBookedRange } from "@/lib/public-demo";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_LABEL = new Intl.DateTimeFormat("en-PH", { month: "long", year: "numeric", timeZone: "UTC" });
const SHORT_LABEL = new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", timeZone: "UTC" });

const utc = (date: string) => new Date(`${date}T00:00:00Z`);
const iso = (date: Date) => date.toISOString().slice(0, 10);
function addDays(date: string, days: number) {
  const next = utc(date);
  next.setUTCDate(next.getUTCDate() + days);
  return iso(next);
}
function addMonths(month: string, delta: number) {
  const next = utc(`${month}-01`);
  next.setUTCMonth(next.getUTCMonth() + delta);
  return iso(next).slice(0, 7);
}
function monthDays(month: string) {
  const first = utc(`${month}-01`);
  const start = addDays(iso(first), -first.getUTCDay());
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0));
  const total = Math.ceil((first.getUTCDay() + last.getUTCDate()) / 7) * 7;
  return Array.from({ length: total }, (_, index) => addDays(start, index));
}

export function AvailabilityCalendar({
  today, booked, nightlyRateCents, dayRates, cleaningFeeCents, contactLabel = "Ask about these dates", onRequest, initialRange,
}: {
  today: string;
  booked: PublicBookedRange[];
  nightlyRateCents: number;
  dayRates: Record<string, number>;
  cleaningFeeCents: number | null;
  contactLabel?: string;
  /** Called with the chosen dates. Wire this to the inquiry or booking flow. */
  onRequest?: (range: { checkIn: string; checkOut: string }) => void;
  initialRange?: { checkIn: string; checkOut: string } | null;
}) {
  const [month, setMonth] = useState(today.slice(0, 7));
  const [start, setStart] = useState<string | null>(initialRange?.checkIn ?? null);
  const [end, setEnd] = useState<string | null>(initialRange?.checkOut ?? null);
  const [hover, setHover] = useState<string | null>(null);

  const isBooked = useMemo(() => {
    return (date: string) => booked.some((range) => date >= range.checkIn && date < range.checkOut);
  }, [booked]);
  const nightFree = (date: string) => date >= today && !isBooked(date);
  const rateFor = (date: string) => dayRates[String(utc(date).getUTCDay())] ?? nightlyRateCents;

  function rangeFree(from: string, to: string) {
    for (let day = from; day < to; day = addDays(day, 1)) if (!nightFree(day)) return false;
    return true;
  }

  function pick(date: string) {
    if (date < today) return;
    if (!start || end) {
      if (nightFree(date)) {
        setStart(date);
        setEnd(null);
      }
      return;
    }
    if (date > start && rangeFree(start, date)) {
      setEnd(date);
    } else if (nightFree(date)) {
      setStart(date);
    }
  }

  const nights = start && end ? Math.round((utc(end).getTime() - utc(start).getTime()) / 86_400_000) : 0;
  const stayCents = useMemo(() => {
    if (!start || !end) return 0;
    let total = 0;
    for (let day = start; day < end; day = addDays(day, 1)) total += rateFor(day);
    return total;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start, end, nightlyRateCents, dayRates]);

  const previewEnd = start && !end && hover && hover > start && rangeFree(start, hover) ? hover : null;
  const bandEnd = end ?? previewEnd;
  const days = monthDays(month);
  const atCurrentMonth = month <= today.slice(0, 7);

  function requestDates() {
    if (start && end) onRequest?.({ checkIn: start, checkOut: end });
  }

  return (
    <section aria-labelledby="availability-heading" className="overflow-hidden rounded-xl border border-pine/12 bg-linen shadow-[0_2px_8px_rgba(32,58,53,0.035)]">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-pine/10 px-4 py-3 sm:px-5">
        <h2 id="availability-heading" className="font-display text-lg text-pine">Availability</h2>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setMonth(addMonths(month, -1))} disabled={atCurrentMonth} aria-label="Previous month" className="inline-flex h-9 w-9 items-center justify-center rounded-md text-pine hover:bg-pine-mist disabled:opacity-30 disabled:hover:bg-transparent">
            <ChevronLeft className="h-5 w-5" aria-hidden />
          </button>
          <span className="min-w-32 text-center text-sm font-medium text-pine sm:min-w-36" aria-live="polite">{MONTH_LABEL.format(utc(`${month}-01`))}</span>
          <button type="button" onClick={() => setMonth(addMonths(month, 1))} aria-label="Next month" className="inline-flex h-9 w-9 items-center justify-center rounded-md text-pine hover:bg-pine-mist">
            <ChevronRight className="h-5 w-5" aria-hidden />
          </button>
        </div>
      </div>

      <div className="px-3 py-4 sm:px-5">
        <div className="mb-4 grid grid-cols-2 gap-2">
          {([
            ["Check-in", start, !start],
            ["Check-out", end, !!start && !end],
          ] as const).map(([label, value, active]) => (
            <div key={label} className={cn("rounded-lg border px-3 py-2", active ? "border-pine bg-pine-mist/60 ring-2 ring-sage" : value ? "border-pine/30 bg-card" : "border-pine/15 bg-card")}>
              <p className="text-xs text-ink/55">{label}</p>
              <p className={cn("text-sm font-medium", value ? "text-pine" : "text-ink/40")}>{value ? SHORT_LABEL.format(utc(value)) : active ? "Pick a day" : "Add date"}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 pb-1 text-center text-xs font-medium text-ink/50">
          {DAY_NAMES.map((name) => <span key={name}>{name}</span>)}
        </div>
        <div className="grid grid-cols-7 gap-y-1" onMouseLeave={() => setHover(null)}>
          {days.map((date) => {
            const inMonth = date.startsWith(month);
            const past = date < today;
            const bookedNight = isBooked(date);
            const isStart = date === start;
            const isEnd = date === end || date === previewEnd;
            const inBand = !!start && !!bandEnd && date > start && date < bandEnd;
            const free = !past && !bookedNight;
            return (
              <div
                key={date}
                className={cn(
                  "relative flex h-11 items-center justify-center",
                  !inMonth && "invisible",
                  inBand && "bg-moss/30",
                  isStart && bandEnd && "rounded-l-full bg-gradient-to-r from-transparent from-50% to-moss/30 to-50%",
                  isEnd && start && "rounded-r-full bg-gradient-to-r from-moss/30 from-50% to-transparent to-50%",
                )}
              >
                <button
                  type="button"
                  onClick={() => pick(date)}
                  onMouseEnter={() => setHover(date)}
                  onFocus={() => setHover(date)}
                  disabled={past || !inMonth}
                  aria-pressed={isStart || date === end || inBand}
                  aria-label={`${SHORT_LABEL.format(utc(date))}, ${past ? "past" : bookedNight ? "booked" : "available"}${isStart ? ", check-in" : date === end ? ", check-out" : ""}`}
                  className={cn(
                    "relative z-10 flex h-10 w-10 items-center justify-center rounded-full text-sm transition-colors",
                    past && "text-ink/25",
                    bookedNight && "text-ink/40 line-through decoration-ink/30",
                    free && "font-medium text-pine hover:bg-pine-mist hover:ring-1 hover:ring-pine/40",
                    inBand && "font-semibold text-pine hover:bg-moss/40",
                    (isStart || date === end) && "bg-pine font-semibold text-paper hover:bg-pine",
                    date === previewEnd && "bg-pine/70 font-semibold text-paper hover:bg-pine/70",
                    date === today && !isStart && !isEnd && "ring-2 ring-clay/60",
                  )}
                >
                  {Number(date.slice(8))}
                </button>
              </div>
            );
          })}
        </div>

        <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-ink/60" aria-label="Legend">
          <li className="flex items-center gap-2"><span className="flex h-5 w-5 items-center justify-center rounded-full border border-pine/20 text-[10px] text-pine">9</span>Available</li>
          <li className="flex items-center gap-2"><span className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] text-ink/40 line-through">9</span>Booked</li>
          <li className="flex items-center gap-2"><span className="h-5 w-5 rounded-full bg-pine" />Check-in / out</li>
          <li className="flex items-center gap-2"><span className="h-3 w-6 rounded-full bg-moss/30" />Your nights</li>
        </ul>
      </div>

      <div className="border-t border-pine/10 bg-paper/60 px-4 py-4 sm:px-5">
        {start && end ? (
          <div className="flex flex-wrap items-end justify-between gap-4">
            <dl className="space-y-1 text-sm">
              <div className="flex gap-2"><dt className="text-ink/55">Stay</dt><dd className="font-medium text-pine">{SHORT_LABEL.format(utc(start))} to {SHORT_LABEL.format(utc(end))} · {nights} {nights === 1 ? "night" : "nights"}</dd></div>
              <div className="flex gap-2"><dt className="text-ink/55">Rate</dt><dd className="text-ink">{formatPHP(stayCents)}</dd></div>
              {cleaningFeeCents ? <div className="flex gap-2"><dt className="text-ink/55">Cleaning fee</dt><dd className="text-ink">{formatPHP(cleaningFeeCents)}</dd></div> : null}
              <div className="flex gap-2 border-t border-pine/10 pt-1"><dt className="font-medium text-ink">Estimated total</dt><dd className="font-semibold text-pine">{formatPHP(stayCents + (cleaningFeeCents ?? 0))}</dd></div>
            </dl>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => { setStart(null); setEnd(null); }}>Clear</Button>
              <Button type="button" variant="clay" onClick={requestDates} disabled={!onRequest}>
                <CalendarCheck className="h-4 w-4" aria-hidden />{contactLabel}
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-ink/60">{start ? (previewEnd ? `${Math.round((utc(previewEnd).getTime() - utc(start).getTime()) / 86_400_000)} nights. Click ${SHORT_LABEL.format(utc(previewEnd))} to set checkout.` : "Now pick your checkout day.") : "Pick your check-in day to start."}</p>
        )}
      </div>
    </section>
  );
}
