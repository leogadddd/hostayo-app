import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { BrushCleaning, ChevronLeft, ChevronRight, Wrench } from "lucide-react";
import { PlatformLogo } from "@/components/app/platform-badge";
import { buttonClassName } from "@/components/ui/button";
import { layoutDayBars } from "@/lib/calendar";
import { barStyle, CalendarLegend } from "./calendar-legend";
import { EventTrigger, QuickViewProvider } from "./event-quick-view";
import type { DisplayCalendarEvent } from "./month-calendar";
import { NowLine } from "./now-line";
import type { TimelineUnit } from "./timeline-calendar";

const HOUR_WIDTH = 64;
const UNIT_COLUMN = 176;
const LANE_HEIGHT = 40;
const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const MIN_HEIGHT = 240;

const FULL_DATE = new Intl.DateTimeFormat("en-PH", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

const hourLabel = (hour: number) =>
  `${hour % 12 || 12} ${hour < 12 ? "AM" : "PM"}`;

/**
 * One day, hour by hour: a row per unit with each stay from its check-in to
 * its check-out, the cleaning window after a departure, and a line at the
 * current time when the day is today.
 */
export function DayTimeline({
  date,
  today,
  timeZone,
  units,
  events,
  previousHref,
  nextHref,
  todayHref,
  viewSwitcher,
}: {
  date: string;
  today: string;
  timeZone: string;
  units: TimelineUnit[];
  events: DisplayCalendarEvent[];
  previousHref: string;
  nextHref: string;
  todayHref: string;
  viewSwitcher?: ReactNode;
}) {
  const { rows } = layoutDayBars(
    date,
    units.map((unit) => unit.id),
    events,
  );
  const unitById = new Map(units.map((unit) => [unit.id, unit]));
  const label = FULL_DATE.format(new Date(`${date}T00:00:00Z`));
  const isToday = date === today;
  const hourColumns = (className = "") => (
    <div
      aria-hidden="true"
      className={`pointer-events-none grid ${className}`}
      style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}
    >
      {HOURS.map((hour) => (
        <div
          key={hour}
          className={`border-r border-pine/10 last:border-r-0 ${hour < 7 || hour >= 21 ? "bg-pine/3" : ""}`}
        />
      ))}
    </div>
  );
  const pct = (fraction: number) => `${fraction * 100}%`;

  return (
    <QuickViewProvider>
      <section
        aria-labelledby="calendar-day"
        className="overflow-hidden rounded-lg border border-pine/15 bg-linen shadow-[0_1px_3px_rgba(32,58,53,0.03)]"
      >
        <div className="flex flex-wrap items-center gap-3 border-b border-pine/15 px-4 py-4 sm:px-5">
          <nav
            aria-label="Calendar day"
            className="flex overflow-hidden rounded-md border border-pine/20"
          >
            <Link
              href={previousHref}
              aria-label="Previous day"
              className="inline-flex h-10 w-10 items-center justify-center hover:bg-pine-mist/60 focus-visible:-outline-offset-2"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </Link>
            <Link
              href={nextHref}
              aria-label="Next day"
              className="inline-flex h-10 w-10 items-center justify-center border-l border-pine/15 hover:bg-pine-mist/60 focus-visible:-outline-offset-2"
            >
              <ChevronRight className="h-5 w-5" aria-hidden />
            </Link>
          </nav>
          <h2
            id="calendar-day"
            className="font-display text-2xl tracking-tight text-pine sm:text-[1.75rem]"
          >
            {label}
          </h2>
          <div className="ml-auto flex items-center gap-2">
            {viewSwitcher}
            <Link
              href={todayHref}
              className={buttonClassName(isToday ? "ghost" : "outline", "sm")}
            >
              Today
            </Link>
          </div>
        </div>
        <div
          tabIndex={0}
          role="region"
          aria-label={`${label} timeline by unit`}
          data-now-scroller
          className="overflow-x-auto focus-visible:-outline-offset-2"
        >
          <div
            className="flex flex-col"
            style={{
              minWidth: UNIT_COLUMN + 24 * HOUR_WIDTH,
              minHeight: MIN_HEIGHT,
            }}
          >
            <div className="flex border-b border-pine/15">
              <div
                className="sticky left-0 z-30 shrink-0 border-r border-pine/15 bg-linen px-3 py-2 text-xs text-ink/60"
                style={{ width: UNIT_COLUMN }}
              >
                Unit
              </div>
              <div
                className="grid flex-1"
                style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}
              >
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="border-r border-pine/10 py-2.5 text-center text-[11px] tabular-nums text-ink/55 last:border-r-0"
                  >
                    {hourLabel(hour)}
                  </div>
                ))}
              </div>
            </div>
            <div className="relative flex flex-1 flex-col">
              {rows.map((row) => {
                const unit = unitById.get(row.unitId)!;
                return (
                  <section
                    key={row.unitId}
                    aria-label={unit.name}
                    className="flex border-b border-pine/15"
                  >
                    <div
                      className="sticky left-0 z-30 flex shrink-0 flex-col justify-center border-r border-pine/15 bg-linen px-3 py-2"
                      style={{ width: UNIT_COLUMN }}
                    >
                      <span className="truncate text-sm font-medium text-pine">
                        {unit.name}
                      </span>
                      {unit.propertyName ? (
                        <span className="truncate text-xs text-ink/55">
                          {unit.propertyName}
                        </span>
                      ) : null}
                      {!unit.bookable ? (
                        <span className="mt-0.5 w-fit rounded bg-amber-100 px-1 text-[11px] font-medium text-amber-900">
                          Not bookable
                        </span>
                      ) : null}
                    </div>
                    <div
                      className="relative flex-1"
                      style={{
                        height: Math.max(row.laneCount, 1) * LANE_HEIGHT + 12,
                      }}
                    >
                      {hourColumns("absolute inset-0")}
                      <div className="absolute inset-x-0 inset-y-1.5">
                        {row.bars.map((bar) => {
                          const { event } = bar;
                          const frame = {
                            left: pct(bar.start),
                            width: pct(bar.end - bar.start),
                            top: bar.lane * LANE_HEIGHT,
                            height: LANE_HEIGHT - 4,
                          } as CSSProperties;
                          if (bar.turnover) {
                            return (
                              <div
                                key={`${event.id}-turnover`}
                                className="absolute flex items-center justify-center gap-1 overflow-hidden rounded-md border border-dashed border-clay/50 bg-clay-mist px-1.5 text-[11px] font-medium text-clay-deep"
                                style={frame}
                                title={`Turnover ${event.turnover!.startTime}–${event.turnover!.endTime} · ${event.unitLabel}`}
                              >
                                <BrushCleaning
                                  className="h-3.5 w-3.5 shrink-0"
                                  aria-hidden
                                />
                                <span className="truncate">Turnover</span>
                              </div>
                            );
                          }
                          const { className, style } = barStyle(event);
                          const wide = bar.end - bar.start >= 0.12;
                          return (
                            <div
                              key={event.id}
                              className="absolute flex"
                              style={frame}
                            >
                              <EventTrigger
                                quickView={event.quickView}
                                href={event.href}
                                aria-label={`${event.accessibleLabel}${bar.continuesBefore ? "; started before this day" : ""}${bar.continuesAfter ? "; continues after this day" : ""}`}
                                title={event.accessibleLabel}
                                className={`z-10 flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden px-2.5 text-[13px] leading-none transition-[filter] hover:brightness-95 focus-visible:z-20 ${className} ${bar.continuesBefore ? "rounded-l-none border-l-0" : "rounded-l-full"} ${bar.continuesAfter ? "rounded-r-none border-r-0" : "rounded-r-full"}`}
                                style={style}
                              >
                                {event.kind === "block" ? (
                                  <Wrench
                                    className="h-3.5 w-3.5 shrink-0"
                                    aria-hidden
                                  />
                                ) : null}
                                {event.platform && wide ? (
                                  <PlatformLogo
                                    platform={event.platform}
                                    className="h-3.5 w-3.5 rounded-[3px]"
                                  />
                                ) : null}
                                <span className="truncate font-semibold">
                                  {event.kind === "block"
                                    ? (event.description ?? event.title)
                                    : event.title}
                                </span>
                                {event.timeLabel &&
                                bar.end - bar.start >= 0.3 ? (
                                  <span className="shrink-0 tabular-nums opacity-70">
                                    {event.timeLabel}
                                  </span>
                                ) : null}
                              </EventTrigger>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </section>
                );
              })}
              <div aria-hidden="true" className="flex flex-1">
                <div
                  className="sticky left-0 z-30 shrink-0 border-r border-pine/15 bg-linen"
                  style={{ width: UNIT_COLUMN }}
                />
                {hourColumns("flex-1")}
              </div>
              {isToday ? (
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-y-0 right-0"
                  style={{ left: UNIT_COLUMN }}
                >
                  <NowLine
                    timeZone={timeZone}
                    days={[date]}
                    showLabel
                    scrollIntoView
                  />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <CalendarLegend />
    </QuickViewProvider>
  );
}
