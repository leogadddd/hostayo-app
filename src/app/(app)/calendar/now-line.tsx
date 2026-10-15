"use client";

import { useEffect, useRef, useState } from "react";

/** The current date and minutes since midnight in a time zone. */
function nowIn(timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "0";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

const TIME_LABEL = (minutes: number) => {
  const hour = Math.floor(minutes / 60);
  const minute = String(minutes % 60).padStart(2, "0");
  return `${hour % 12 || 12}:${minute} ${hour < 12 ? "AM" : "PM"}`;
};

/**
 * A vertical line at the current time, across whatever it's placed in (a
 * week of the month grid, the timeline, or the day view). `days` are the equal
 * columns of the horizontal axis, so the line sits at its day's column plus
 * the share of the day that has passed. It follows the property's time zone,
 * ticks every 30 seconds, and renders nothing when today isn't on screen.
 */
export function NowLine({
  timeZone,
  days,
  showLabel = false,
  scrollIntoView = false,
}: {
  timeZone: string;
  days: readonly string[];
  /** Show the time in a pill at the top of the line. */
  showLabel?: boolean;
  /** Scroll the horizontal scroller so the line is in view, once. */
  scrollIntoView?: boolean;
}) {
  const [now, setNow] = useState<{ date: string; minutes: number } | null>(
    null,
  );
  const ref = useRef<HTMLDivElement>(null);
  const scrolled = useRef(false);

  useEffect(() => {
    // Set after mount, so the server and first client render agree.
    const tick = () => setNow(nowIn(timeZone));
    tick();
    const timer = setInterval(tick, 30_000);
    return () => clearInterval(timer);
  }, [timeZone]);

  useEffect(() => {
    if (!now || !scrollIntoView || scrolled.current || !ref.current) return;
    scrolled.current = true;
    // Only the horizontal scroller moves: the page stays where it is.
    const scroller = ref.current.closest<HTMLElement>("[data-now-scroller]");
    if (scroller) {
      const line = ref.current.getBoundingClientRect();
      const box = scroller.getBoundingClientRect();
      scroller.scrollLeft += line.left - box.left - box.width / 2;
    }
  }, [now, scrollIntoView]);

  if (!now) return null;
  const index = days.indexOf(now.date);
  if (index === -1) return null;
  const left = ((index + now.minutes / 1440) / days.length) * 100;

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute inset-y-0 z-20"
      style={{ left: `${left}%` }}
      title={`Now, ${TIME_LABEL(now.minutes)}`}
    >
      <span className="absolute inset-y-0 left-0 w-0.5 -translate-x-1/2 bg-clay" />
      {showLabel ? (
        <span className="absolute left-0 top-0 -translate-x-1/2 whitespace-nowrap rounded-full bg-clay px-2 py-0.5 text-[10px] font-semibold tabular-nums text-white shadow-sm">
          {TIME_LABEL(now.minutes)}
        </span>
      ) : (
        <span className="absolute left-0 top-0 h-2 w-2 -translate-x-1/2 rounded-full bg-clay" />
      )}
    </div>
  );
}
