"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  Broom as BrushCleaning,
  CaretLeft as ChevronLeft,
  CaretRight as ChevronRight,
  CircleNotch as LoaderCircle,
  Wrench,
} from "@/components/ui/icons";
import { PlatformLogo } from "@/components/app/platform-badge";
import { buttonClassName } from "@/components/ui/button";
import { layoutTimelineRange } from "@/lib/calendar";
import { shiftMonth } from "@/lib/dates";
import { barStyle, CalendarLegend } from "./calendar-legend";
import { CalendarSelection } from "./calendar-selection";
import { EventTrigger, QuickViewProvider } from "./event-quick-view";
import type { DisplayCalendarEvent } from "./month-calendar";
import { NowLine } from "./now-line";

export interface TimelineUnit {
  id: string;
  name: string;
  propertyName: string | null;
  /** Active units take new reservations by dragging across their row. */
  bookable: boolean;
}

const WEEKDAY = new Intl.DateTimeFormat("en-PH", {
  weekday: "narrow",
  timeZone: "UTC",
});
const FULL_DATE_LABEL = new Intl.DateTimeFormat("en-PH", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});
const MONTH_LABEL = new Intl.DateTimeFormat("en-PH", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const monthLabel = (month: string) =>
  MONTH_LABEL.format(new Date(`${month}-01T00:00:00Z`));

const DAY_WIDTH = 44;
const UNIT_COLUMN = 176;
const LANE_HEIGHT = 34;
// As tall as an empty six-week month grid (37px day-name row plus 103px per
// week), whatever the month, so switching views doesn't jump.
const MIN_HEIGHT = 37 + 6 * 103;
/** Load more once fewer than this many days are left past the edge you're nearing. */
const EDGE_DAYS = 45;

/**
 * Gantt view: one row per unit and one column per day, scrolling sideways
 * through the months without a break. The server sends a window of months
 * around the one in the URL; as you scroll close to either end of it, the
 * page reloads centred on the month you're looking at and the timeline keeps
 * the same day under your eye, so it feels endless in both directions. The
 * month in the heading follows the scroll.
 */
export function TimelineCalendar({
  month,
  today,
  timeZone,
  units,
  events,
  rangeStart,
  rangeEnd,
  unitId,
  basePath = "/calendar",
  viewSwitcher,
}: {
  /** The month the server centred the window on. */
  month: string;
  today: string;
  timeZone: string;
  units: TimelineUnit[];
  events: DisplayCalendarEvent[];
  /** The first loaded day, and the day after the last. */
  rangeStart: string;
  rangeEnd: string;
  /** The unit filter, so reloads keep it. */
  unitId: string | null;
  /** Where the calendar lives, for the address as you scroll. */
  basePath?: string;
  viewSwitcher?: ReactNode;
}) {
  const router = useRouter();
  const { days, rows } = useMemo(
    () =>
      layoutTimelineRange(
        rangeStart,
        rangeEnd,
        units.map((unit) => unit.id),
        events,
      ),
    [rangeStart, rangeEnd, units, events],
  );
  const unitById = useMemo(
    () => new Map(units.map((unit) => [unit.id, unit])),
    [units],
  );
  // Each month's run of days, for the header and the label that follows you.
  const months = useMemo(() => {
    const runs: { key: string; count: number }[] = [];
    for (const day of days) {
      const key = day.slice(0, 7);
      const last = runs[runs.length - 1];
      if (last?.key === key) last.count += 1;
      else runs.push({ key, count: 1 });
    }
    return runs;
  }, [days]);

  const scroller = useRef<HTMLDivElement>(null);
  const daysRef = useRef(days);
  const [visibleMonth, setVisibleMonth] = useState(month);
  const [loading, startTransition] = useTransition();
  // The day at the left edge (and how far into it), so a reload can put it back.
  const lastView = useRef<{ date: string; offset: number } | null>(null);
  const recentering = useRef(false);
  // A month to scroll to once the next window arrives (or on first paint).
  const wantMonth = useRef<string | null>(month);

  const hrefFor = useCallback(
    (target: string) =>
      `${basePath}?${new URLSearchParams({
        month: target,
        view: "timeline",
        ...(unitId ? { unit: unitId } : {}),
      })}`,
    [unitId, basePath],
  );

  // First paint, a jump to a month outside the window, or a reload: put the
  // timeline where it belongs before it's drawn.
  useLayoutEffect(() => {
    // Before anything moves: a scroll event must read the new days, not the old.
    daysRef.current = days;
    const element = scroller.current;
    if (!element) return;
    if (recentering.current && lastView.current) {
      const index = days.indexOf(lastView.current.date);
      if (index >= 0) {
        element.scrollLeft = index * DAY_WIDTH + lastView.current.offset;
        setVisibleMonth(
          days[Math.min(days.length - 1, index + 7)]!.slice(0, 7),
        );
      }
      return;
    }
    if (wantMonth.current) {
      const index = days.indexOf(`${wantMonth.current}-01`);
      if (index >= 0) {
        element.scrollLeft = index * DAY_WIDTH;
        wantMonth.current = null;
        setVisibleMonth(days[index]!.slice(0, 7));
      }
    }
  }, [days]);

  useEffect(() => {
    // A finished reload (or a failed one) ends the recentering.
    if (!loading) recentering.current = false;
  }, [loading]);

  const reloadAround = useCallback(
    (target: string) => {
      startTransition(() => router.replace(hrefFor(target), { scroll: false }));
    },
    [router, hrefFor],
  );

  const handleScroll = useCallback(() => {
    const element = scroller.current;
    if (!element) return;
    const list = daysRef.current;
    const index = Math.max(
      0,
      Math.min(list.length - 1, Math.floor(element.scrollLeft / DAY_WIDTH)),
    );
    lastView.current = {
      date: list[index]!,
      offset: element.scrollLeft - index * DAY_WIDTH,
    };
    // The month in view is the one a week into the visible days.
    const current = list[Math.min(list.length - 1, index + 7)]!.slice(0, 7);
    setVisibleMonth((previous) => (previous === current ? previous : current));
    const visibleDays = Math.ceil(
      (element.clientWidth - UNIT_COLUMN) / DAY_WIDTH,
    );
    const nearStart = index < EDGE_DAYS;
    const nearEnd = list.length - (index + visibleDays) < EDGE_DAYS;
    if ((nearStart || nearEnd) && !recentering.current && current !== month) {
      recentering.current = true;
      reloadAround(current);
    }
  }, [month, reloadAround]);

  // Keep the address current as you scroll, so a refresh stays on this month.
  const firstUrlSync = useRef(true);
  useEffect(() => {
    if (firstUrlSync.current) {
      firstUrlSync.current = false;
      return;
    }
    if (recentering.current) return;
    window.history.replaceState(null, "", hrefFor(visibleMonth));
  }, [visibleMonth, hrefFor]);

  /** Scroll to a month's first day, or reload around it when it isn't loaded. */
  const goToMonth = (target: string) => {
    const index = days.indexOf(`${target}-01`);
    if (index >= 0) {
      scroller.current?.scrollTo({
        left: index * DAY_WIDTH,
        behavior: "smooth",
      });
      return;
    }
    wantMonth.current = target;
    recentering.current = false;
    reloadAround(target);
  };
  const goToToday = () => {
    const index = days.indexOf(today);
    if (index >= 0) {
      scroller.current?.scrollTo({
        left: Math.max(0, index - 3) * DAY_WIDTH,
        behavior: "smooth",
      });
      return;
    }
    goToMonth(today.slice(0, 7));
  };

  const pct = (value: number) => `${(value / days.length) * 100}%`;
  const weekend = (day: string) =>
    [0, 6].includes(new Date(`${day}T00:00:00Z`).getUTCDay());
  const daysWidth = days.length * DAY_WIDTH;
  const dayColumns = (className = "") => (
    <div
      aria-hidden="true"
      className={`pointer-events-none grid ${className}`}
      style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}
    >
      {days.map((day) => (
        <div
          key={day}
          className={`border-r border-pine/10 last:border-r-0 ${day.endsWith("-01") ? "border-l-2 border-l-pine/25" : ""} ${day === today ? "bg-clay-mist/50" : weekend(day) ? "bg-pine/3" : ""}`}
        />
      ))}
    </div>
  );

  return (
    <QuickViewProvider>
      <section
        aria-labelledby="calendar-month"
        aria-busy={loading}
        className="overflow-hidden rounded-lg border border-pine/15 bg-linen shadow-[0_1px_3px_rgba(32,58,53,0.03)]"
      >
        <div className="flex flex-wrap items-center gap-3 border-b border-pine/15 px-4 py-4 sm:px-5">
          <nav
            aria-label="Calendar month"
            className="flex overflow-hidden rounded-md border border-pine/20"
          >
            <button
              type="button"
              onClick={() => goToMonth(shiftMonth(visibleMonth, -1))}
              aria-label="Previous month"
              className="inline-flex h-10 w-10 items-center justify-center hover:bg-pine-mist/60 focus-visible:-outline-offset-2"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => goToMonth(shiftMonth(visibleMonth, 1))}
              aria-label="Next month"
              className="inline-flex h-10 w-10 items-center justify-center border-l border-pine/15 hover:bg-pine-mist/60 focus-visible:-outline-offset-2"
            >
              <ChevronRight className="h-5 w-5" aria-hidden />
            </button>
          </nav>
          <h2
            id="calendar-month"
            aria-live="polite"
            className="font-display text-2xl tracking-tight text-pine sm:text-[1.75rem]"
          >
            {monthLabel(visibleMonth)}
          </h2>
          {loading ? (
            <LoaderCircle
              className="h-4 w-4 animate-spin text-pine/50"
              aria-label="Loading more days"
            />
          ) : null}
          <div className="ml-auto flex items-center gap-2">
            {viewSwitcher}
            <button
              type="button"
              onClick={goToToday}
              className={buttonClassName("outline", "sm")}
            >
              Today
            </button>
          </div>
        </div>
        <div
          ref={scroller}
          onScroll={handleScroll}
          tabIndex={0}
          role="region"
          aria-label="Timeline by unit. Scroll sideways to move through months."
          className="overflow-x-auto focus-visible:-outline-offset-2"
        >
          <div
            className="flex flex-col"
            style={{
              minWidth: UNIT_COLUMN + daysWidth,
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
              <div style={{ width: daysWidth }}>
                <div className="flex border-b border-pine/10">
                  {months.map((run) => (
                    <div
                      key={run.key}
                      className="border-l-2 border-pine/25 first:border-l-0"
                      style={{ width: run.count * DAY_WIDTH }}
                    >
                      {/* The name stays in view while its month scrolls past. */}
                      <span
                        className="sticky inline-block whitespace-nowrap px-3 py-1 text-xs font-semibold text-pine"
                        style={{ left: UNIT_COLUMN }}
                      >
                        {monthLabel(run.key)}
                      </span>
                    </div>
                  ))}
                </div>
                <div
                  className="grid"
                  style={{
                    gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))`,
                  }}
                >
                  {days.map((day) => {
                    const currentDay = day === today;
                    return (
                      <div
                        key={day}
                        className={`flex flex-col items-center border-r border-pine/10 py-1.5 last:border-r-0 ${day.endsWith("-01") ? "border-l-2 border-l-pine/25" : ""} ${weekend(day) ? "bg-pine/3" : ""}`}
                      >
                        <span className="text-[10px] uppercase text-ink/50">
                          {WEEKDAY.format(new Date(`${day}T00:00:00Z`))}
                        </span>
                        <time
                          dateTime={day}
                          aria-label={FULL_DATE_LABEL.format(
                            new Date(`${day}T00:00:00Z`),
                          )}
                          aria-current={currentDay ? "date" : undefined}
                          className={`mt-0.5 inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs tabular-nums ${currentDay ? "bg-clay font-semibold text-white" : "text-ink"}`}
                        >
                          {Number(day.slice(-2))}
                        </time>
                      </div>
                    );
                  })}
                </div>
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
                      className="relative py-1.5"
                      style={{
                        width: daysWidth,
                        height: Math.max(row.laneCount, 1) * LANE_HEIGHT + 12,
                      }}
                    >
                      {dayColumns("absolute inset-0")}
                      <div className="absolute inset-x-0 inset-y-1.5">
                        {unit.bookable ? (
                          <CalendarSelection days={days} unitId={unit.id} />
                        ) : null}
                        {row.bars.map(
                          ({
                            event,
                            start,
                            end,
                            lane,
                            continuesBefore,
                            continuesAfter,
                          }) => {
                            const { className, style } = barStyle(event);
                            const showMarker =
                              event.turnover && !continuesAfter;
                            return (
                              <div
                                key={event.id}
                                className="absolute flex"
                                style={
                                  {
                                    left: pct(start),
                                    width: pct(end - start),
                                    top: lane * LANE_HEIGHT,
                                    height: LANE_HEIGHT - 4,
                                  } as CSSProperties
                                }
                              >
                                <EventTrigger
                                  quickView={event.quickView}
                                  href={event.href}
                                  aria-label={`${event.accessibleLabel}${continuesBefore ? "; continued from before" : ""}${continuesAfter ? "; continues after" : ""}`}
                                  title={event.accessibleLabel}
                                  className={`z-10 flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden px-2.5 text-[13px] leading-none transition-[filter] hover:brightness-95 focus-visible:z-20 ${className} ${continuesBefore ? "rounded-l-none border-l-0" : "ml-0.5 rounded-l-full"} ${continuesAfter ? "rounded-r-none border-r-0" : "mr-0.5 rounded-r-full"} ${showMarker ? "pr-4" : ""}`}
                                  style={style}
                                >
                                  {event.kind === "block" ? (
                                    <Wrench
                                      className="h-3.5 w-3.5 shrink-0"
                                      aria-hidden
                                    />
                                  ) : null}
                                  {/* Short bars keep their room for the guest's name. */}
                                  {event.platform && end - start >= 3 ? (
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
                                  {event.timeLabel && end - start >= 3 ? (
                                    <span className="shrink-0 tabular-nums opacity-70">
                                      {event.timeLabel}
                                    </span>
                                  ) : null}
                                </EventTrigger>
                                {showMarker ? (
                                  <span
                                    aria-hidden
                                    className="pointer-events-none absolute right-0 top-1/2 z-20 inline-flex h-6 w-6 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full border border-clay/50 bg-clay-mist text-clay-deep shadow-sm"
                                    title={`Turnover ${event.turnover!.startTime}–${event.turnover!.endTime}`}
                                  >
                                    <BrushCleaning className="h-3.5 w-3.5" />
                                  </span>
                                ) : null}
                              </div>
                            );
                          },
                        )}
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
                <div className="relative flex-1" style={{ width: daysWidth }}>
                  {dayColumns("absolute inset-0")}
                </div>
              </div>
              {/* The line at the current time, across every unit's row. */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-y-0"
                style={{ left: UNIT_COLUMN, width: daysWidth }}
              >
                <NowLine timeZone={timeZone} days={days} showLabel />
              </div>
            </div>
          </div>
        </div>
      </section>

      <CalendarLegend />
    </QuickViewProvider>
  );
}
