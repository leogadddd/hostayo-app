"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  BrushCleaning,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  Wrench,
} from "lucide-react";
import { PlatformLogo } from "@/components/app/platform-badge";
import { buttonClassName } from "@/components/ui/button";
import { layoutDayBars } from "@/lib/calendar";
import { barStyle, CalendarLegend } from "./calendar-legend";
import { EventTrigger, QuickViewProvider } from "./event-quick-view";
import type { DisplayCalendarEvent } from "./month-calendar";
import { TIME_LABEL, useNow } from "./now-line";
import type { TimelineUnit } from "./timeline-calendar";
import { InfoTip } from "@/components/ui/info-tip";

/** Pixels per hour: the zoom. The range keeps a day readable at both ends. */
export const DEFAULT_HOUR_HEIGHT = 56;
export const MIN_HOUR_HEIGHT = 24;
export const MAX_HOUR_HEIGHT = 160;

const GUTTER = 64;
const COLUMN_MIN = 168;
const HEADER_HEIGHT = 56;
const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

const FULL_DATE = new Intl.DateTimeFormat("en-PH", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

const hourLabel = (hour: number) =>
  `${hour % 12 || 12} ${hour < 12 ? "AM" : "PM"}`;
const clampHeight = (value: number) =>
  Math.min(MAX_HOUR_HEIGHT, Math.max(MIN_HOUR_HEIGHT, value));

/**
 * One day, top to bottom: hours down the side and a column per unit, with each
 * stay from its check-in to its check-out, the cleaning window after a
 * departure, and a line at the current time on today.
 *
 * Zoom changes the height of an hour, between a minimum and a maximum:
 * pinch on a touch screen or trackpad, Ctrl or ⌘ with the scroll wheel,
 * double-click (or double-tap) and hold, then drag up to zoom in or down to
 * zoom out, a plain double-click for one step in, or the buttons and + / −
 * keys. The time under your fingers stays put while it zooms.
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
  const { rows } = useMemo(
    () =>
      layoutDayBars(
        date,
        units.map((unit) => unit.id),
        events,
      ),
    [date, units, events],
  );
  const unitById = useMemo(
    () => new Map(units.map((unit) => [unit.id, unit])),
    [units],
  );
  const label = FULL_DATE.format(new Date(`${date}T00:00:00Z`));
  const isToday = date === today;
  const now = useNow(timeZone);
  const nowMinutes = isToday && now?.date === date ? now.minutes : null;

  const [hourHeight, setHourHeight] = useState(DEFAULT_HOUR_HEIGHT);
  const hourRef = useRef(hourHeight);
  const scroller = useRef<HTMLDivElement>(null);
  // Where the content should sit after a zoom, so the anchor doesn't move.
  const pending = useRef<{ contentY: number; localY: number } | null>(null);
  const positioned = useRef(false);

  /**
   * Zoom to a new hour height, keeping the moment at `localY` (pixels below
   * the top of the scroller; the middle by default) where it is on screen.
   */
  const zoomTo = useCallback((next: number, localY?: number) => {
    const target = clampHeight(next);
    const previous = hourRef.current;
    if (Math.abs(target - previous) < 0.01) return;
    const element = scroller.current;
    if (element) {
      const y = localY ?? element.clientHeight / 2;
      const contentY =
        (element.scrollTop + y - HEADER_HEIGHT) * (target / previous);
      pending.current = { contentY, localY: y };
    }
    hourRef.current = target;
    setHourHeight(target);
  }, []);

  /** A plain double-click: one step in, then back to the default. */
  const stepZoom = useCallback(
    (localY?: number) => {
      const atMax = hourRef.current >= MAX_HOUR_HEIGHT * 0.98;
      zoomTo(atMax ? DEFAULT_HOUR_HEIGHT : hourRef.current * 1.6, localY);
    },
    [zoomTo],
  );

  useLayoutEffect(() => {
    const element = scroller.current;
    const wanted = pending.current;
    if (!element || !wanted) return;
    pending.current = null;
    element.scrollTop = wanted.contentY + HEADER_HEIGHT - wanted.localY;
  }, [hourHeight]);

  // Open at the current time, or mid-morning on another day.
  useLayoutEffect(() => {
    const element = scroller.current;
    if (!element || positioned.current) return;
    if (isToday && nowMinutes === null) return;
    positioned.current = true;
    const focusHour = isToday ? nowMinutes! / 60 - 2 : 7;
    element.scrollTop = Math.max(0, focusHour * hourRef.current);
  }, [isToday, nowMinutes, hourHeight]);

  // Gestures. These need non-passive listeners to stop the page zooming or
  // scrolling while one is under way, so they're attached by hand.
  useEffect(() => {
    const element = scroller.current;
    if (!element) return;
    const localY = (clientY: number) =>
      clientY - element.getBoundingClientRect().top;
    const onControls = (target: EventTarget | null) =>
      target instanceof Element && Boolean(target.closest("a, button"));

    // Trackpad pinch and Ctrl/⌘ + scroll arrive as wheel events.
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const delta = Math.max(-40, Math.min(40, event.deltaY));
      zoomTo(
        hourRef.current * Math.exp(-delta * 0.0125),
        localY(event.clientY),
      );
    };

    // Touch: two fingers pinch; double-tap, hold and drag.
    let pinch: { distance: number; height: number } | null = null;
    let hold: {
      startY: number;
      height: number;
      anchor: number;
      moved: boolean;
    } | null = null;
    let lastTap = { time: 0, x: 0, y: 0 };
    let touchStart = { x: 0, y: 0 };
    const spread = (touches: TouchList) =>
      Math.hypot(
        touches[0]!.clientX - touches[1]!.clientX,
        touches[0]!.clientY - touches[1]!.clientY,
      );
    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length === 2) {
        hold = null;
        pinch = { distance: spread(event.touches), height: hourRef.current };
        return;
      }
      if (event.touches.length !== 1 || onControls(event.target)) return;
      const touch = event.touches[0]!;
      touchStart = { x: touch.clientX, y: touch.clientY };
      const quick = Date.now() - lastTap.time < 300;
      const near =
        Math.hypot(touch.clientX - lastTap.x, touch.clientY - lastTap.y) < 30;
      if (quick && near) {
        // Second tap: stop the page scrolling and treat movement as zoom.
        event.preventDefault();
        hold = {
          startY: touch.clientY,
          height: hourRef.current,
          anchor: localY(touch.clientY),
          moved: false,
        };
        lastTap.time = 0;
      }
    };
    const onTouchMove = (event: TouchEvent) => {
      if (pinch && event.touches.length === 2) {
        event.preventDefault();
        const middle =
          (event.touches[0]!.clientY + event.touches[1]!.clientY) / 2;
        zoomTo(
          (pinch.height * spread(event.touches)) / pinch.distance,
          localY(middle),
        );
      } else if (hold && event.touches.length === 1) {
        event.preventDefault();
        const delta = hold.startY - event.touches[0]!.clientY;
        if (Math.abs(delta) > 6) hold.moved = true;
        zoomTo(hold.height * Math.exp(delta / 180), hold.anchor);
      }
    };
    const onTouchEnd = (event: TouchEvent) => {
      if (event.touches.length < 2) pinch = null;
      if (event.touches.length > 0) return;
      if (hold) {
        if (!hold.moved) stepZoom(hold.anchor);
        hold = null;
        return;
      }
      const touch = event.changedTouches[0];
      if (
        touch &&
        Math.hypot(touch.clientX - touchStart.x, touch.clientY - touchStart.y) <
          10
      ) {
        lastTap = { time: Date.now(), x: touch.clientX, y: touch.clientY };
      }
    };

    // Mouse: double-click and hold, then drag up (in) or down (out).
    let lastUp = { time: 0, x: 0, y: 0 };
    let drag: {
      startY: number;
      height: number;
      anchor: number;
      moved: boolean;
    } | null = null;
    const onMouseDown = (event: MouseEvent) => {
      if (event.button !== 0 || onControls(event.target)) return;
      const quick = Date.now() - lastUp.time < 300;
      const near =
        Math.hypot(event.clientX - lastUp.x, event.clientY - lastUp.y) < 8;
      if (!quick || !near) return;
      event.preventDefault(); // No text selection while dragging.
      drag = {
        startY: event.clientY,
        height: hourRef.current,
        anchor: localY(event.clientY),
        moved: false,
      };
    };
    const onMouseMove = (event: MouseEvent) => {
      if (!drag) return;
      const delta = drag.startY - event.clientY;
      if (Math.abs(delta) > 4) drag.moved = true;
      zoomTo(drag.height * Math.exp(delta / 180), drag.anchor);
    };
    const onMouseUp = (event: MouseEvent) => {
      if (drag) {
        if (!drag.moved) stepZoom(drag.anchor);
        drag = null;
        lastUp.time = 0;
        return;
      }
      if (element.contains(event.target as Node)) {
        lastUp = { time: Date.now(), x: event.clientX, y: event.clientY };
      }
    };

    // Safari reports trackpad pinches as its own gesture events.
    let gestureStart = hourRef.current;
    type GestureEvent = Event & { scale: number; clientY: number };
    const onGestureStart = (event: Event) => {
      event.preventDefault();
      gestureStart = hourRef.current;
    };
    const onGestureChange = (event: Event) => {
      event.preventDefault();
      const gesture = event as GestureEvent;
      zoomTo(gestureStart * gesture.scale, localY(gesture.clientY));
    };

    element.addEventListener("wheel", onWheel, { passive: false });
    element.addEventListener("touchstart", onTouchStart, { passive: false });
    element.addEventListener("touchmove", onTouchMove, { passive: false });
    element.addEventListener("touchend", onTouchEnd);
    element.addEventListener("touchcancel", onTouchEnd);
    element.addEventListener("mousedown", onMouseDown);
    element.addEventListener("gesturestart", onGestureStart);
    element.addEventListener("gesturechange", onGestureChange);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      element.removeEventListener("wheel", onWheel);
      element.removeEventListener("touchstart", onTouchStart);
      element.removeEventListener("touchmove", onTouchMove);
      element.removeEventListener("touchend", onTouchEnd);
      element.removeEventListener("touchcancel", onTouchEnd);
      element.removeEventListener("mousedown", onMouseDown);
      element.removeEventListener("gesturestart", onGestureStart);
      element.removeEventListener("gesturechange", onGestureChange);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [zoomTo, stepZoom]);

  const total = 24 * hourHeight;
  const atMin = hourHeight <= MIN_HOUR_HEIGHT + 0.01;
  const atMax = hourHeight >= MAX_HOUR_HEIGHT - 0.01;
  const grid: CSSProperties = {
    gridTemplateColumns: `repeat(${Math.max(rows.length, 1)}, minmax(${COLUMN_MIN}px, 1fr))`,
  };
  const rules: CSSProperties = {
    backgroundImage:
      hourHeight >= 80
        ? "linear-gradient(to bottom, rgba(32,58,53,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(32,58,53,0.12) 1px, transparent 1px)"
        : "linear-gradient(to bottom, rgba(32,58,53,0.12) 1px, transparent 1px)",
    backgroundSize:
      hourHeight >= 80
        ? `100% ${hourHeight / 2}px, 100% ${hourHeight}px`
        : `100% ${hourHeight}px`,
  };

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
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <div
              role="group"
              aria-label="Zoom"
              className="flex items-center overflow-hidden rounded-md border border-pine/20"
            >
              <button
                type="button"
                onClick={() => zoomTo(hourRef.current / 1.25)}
                disabled={atMin}
                aria-label="Zoom out"
                className="inline-flex h-9 w-9 items-center justify-center hover:bg-pine-mist/60 disabled:opacity-35 focus-visible:-outline-offset-2"
              >
                <Minus className="h-4 w-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => zoomTo(DEFAULT_HOUR_HEIGHT)}
                aria-label="Reset zoom"
                title="Reset zoom"
                className="h-9 min-w-14 border-x border-pine/15 px-2 text-xs font-medium tabular-nums text-pine hover:bg-pine-mist/60 focus-visible:-outline-offset-2"
              >
                {Math.round((hourHeight / DEFAULT_HOUR_HEIGHT) * 100)}%
              </button>
              <button
                type="button"
                onClick={() => zoomTo(hourRef.current * 1.25)}
                disabled={atMax}
                aria-label="Zoom in"
                className="inline-flex h-9 w-9 items-center justify-center hover:bg-pine-mist/60 disabled:opacity-35 focus-visible:-outline-offset-2"
              >
                <Plus className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <InfoTip>
              Pinch, hold Ctrl and scroll, or double-click and drag to zoom.
            </InfoTip>
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
          ref={scroller}
          tabIndex={0}
          role="region"
          aria-label={`${label} timeline by unit`}
          onKeyDown={(event) => {
            if (event.key === "+" || event.key === "=") {
              event.preventDefault();
              zoomTo(hourRef.current * 1.25);
            } else if (event.key === "-") {
              event.preventDefault();
              zoomTo(hourRef.current / 1.25);
            } else if (event.key === "0") {
              event.preventDefault();
              zoomTo(DEFAULT_HOUR_HEIGHT);
            }
          }}
          className="relative max-h-[calc(100dvh-22rem)] min-h-[24rem] touch-pan-x touch-pan-y select-none overflow-auto overscroll-contain focus-visible:-outline-offset-2"
        >
          <div style={{ minWidth: GUTTER + rows.length * COLUMN_MIN }}>
            <div
              className="sticky top-0 z-30 flex border-b border-pine/15 bg-linen"
              style={{ height: HEADER_HEIGHT }}
            >
              <div
                className="sticky left-0 z-10 shrink-0 border-r border-pine/15 bg-linen"
                style={{ width: GUTTER }}
              />
              <div className="grid flex-1" style={grid}>
                {rows.map((row) => {
                  const unit = unitById.get(row.unitId)!;
                  return (
                    <div
                      key={row.unitId}
                      className="flex min-w-0 flex-col justify-center border-r border-pine/15 px-3 last:border-r-0"
                    >
                      <span className="truncate text-sm font-medium text-pine">
                        {unit.name}
                      </span>
                      {unit.propertyName ? (
                        <span className="truncate text-xs text-ink/55">
                          {unit.propertyName}
                        </span>
                      ) : !unit.bookable ? (
                        <span className="w-fit rounded bg-amber-100 px-1 text-[11px] font-medium text-amber-900">
                          Not bookable
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="relative flex" style={{ height: total }}>
              <div
                className="sticky left-0 z-20 shrink-0 border-r border-pine/15 bg-linen"
                style={{ width: GUTTER }}
              >
                {HOURS.map((hour) => (
                  <span
                    key={hour}
                    className="absolute right-2 -translate-y-1/2 text-[11px] tabular-nums text-ink/55"
                    style={{ top: hour === 0 ? 8 : hour * hourHeight }}
                  >
                    {hourLabel(hour)}
                  </span>
                ))}
                {nowMinutes !== null ? (
                  <span
                    className="absolute right-1 z-10 -translate-y-1/2 whitespace-nowrap rounded-full bg-clay px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-white shadow-sm"
                    style={{ top: (nowMinutes / 1440) * total }}
                  >
                    {TIME_LABEL(nowMinutes)}
                  </span>
                ) : null}
              </div>
              <div
                className="relative grid flex-1"
                style={{ ...grid, ...rules }}
              >
                {/* Quiet hours: before 7 AM and from 9 PM. */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 top-0 bg-pine/3"
                  style={{ height: 7 * hourHeight }}
                />
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 bottom-0 bg-pine/3"
                  style={{ height: 3 * hourHeight }}
                />
                {rows.map((row) => (
                  <section
                    key={row.unitId}
                    aria-label={unitById.get(row.unitId)!.name}
                    className="relative border-r border-pine/10 last:border-r-0"
                  >
                    {row.bars.map((bar) => {
                      const { event } = bar;
                      const lanes = Math.max(row.laneCount, 1);
                      const height = Math.max(
                        (bar.end - bar.start) * total - 3,
                        14,
                      );
                      const frame = {
                        top: bar.start * total + 1,
                        height,
                        left: `calc(${(bar.lane / lanes) * 100}% + 3px)`,
                        width: `calc(${100 / lanes}% - 6px)`,
                      } as CSSProperties;
                      if (bar.turnover) {
                        return (
                          <div
                            key={`${event.id}-turnover`}
                            className="absolute flex items-center gap-1 overflow-hidden rounded-md border border-dashed border-clay/50 bg-clay-mist px-2 text-[11px] font-medium text-clay-deep"
                            style={frame}
                            title={`Turnover ${event.turnover!.startTime}–${event.turnover!.endTime} · ${event.unitLabel}`}
                          >
                            <BrushCleaning
                              className="h-3.5 w-3.5 shrink-0"
                              aria-hidden
                            />
                            {height >= 22 ? (
                              <span className="truncate">Turnover</span>
                            ) : null}
                          </div>
                        );
                      }
                      const { className, style } = barStyle(event);
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
                            className={`z-10 flex min-w-0 flex-1 flex-col items-start justify-start gap-0.5 overflow-hidden px-2.5 py-1 text-left text-[13px] leading-tight transition-[filter] hover:brightness-95 focus-visible:z-20 ${className} ${bar.continuesBefore ? "rounded-t-none border-t-0" : "rounded-t-xl"} ${bar.continuesAfter ? "rounded-b-none border-b-0" : "rounded-b-xl"}`}
                            style={style}
                          >
                            <span className="flex w-full min-w-0 items-center gap-1.5">
                              {event.kind === "block" ? (
                                <Wrench
                                  className="h-3.5 w-3.5 shrink-0"
                                  aria-hidden
                                />
                              ) : null}
                              {event.platform && height >= 30 ? (
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
                            </span>
                            {event.timeLabel && height >= 46 ? (
                              <span className="tabular-nums opacity-70">
                                {event.timeLabel}
                              </span>
                            ) : null}
                          </EventTrigger>
                        </div>
                      );
                    })}
                  </section>
                ))}
                {nowMinutes !== null ? (
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 z-20"
                    style={{ top: (nowMinutes / 1440) * total }}
                  >
                    <span className="absolute inset-x-0 h-0.5 -translate-y-1/2 bg-clay" />
                    <span className="absolute left-0 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-clay" />
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      <CalendarLegend />
    </QuickViewProvider>
  );
}
