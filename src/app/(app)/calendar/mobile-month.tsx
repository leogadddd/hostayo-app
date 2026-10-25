"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import {
  CaretLeft as ChevronLeft,
  CaretRight as ChevronRight,
} from "@/components/ui/icons";
import { MOBILE_CARD } from "@/components/app/mobile-ui";
import { cn } from "@/lib/utils";
import { barStyle } from "./calendar-legend";
import type { DisplayCalendarEvent } from "./month-calendar";

/** The few fields the phone month needs from each calendar event. */
export interface PhoneEvent {
  id: string;
  kind: "stay" | "hold" | "block" | "unavailable";
  status?: "hold" | "confirmed" | "checked_in" | "checked_out";
  title: string;
  unitLabel: string;
  startDate: string;
  /** Exclusive: the check-out date. */
  endDate: string;
  href?: string;
  timeLabel?: string;
  platformName?: string;
}

const DAY_NAMES = ["S", "M", "T", "W", "T", "F", "S"];
const DAY_TITLE = new Intl.DateTimeFormat("en-PH", {
  weekday: "long",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});

const SHORT_TITLE = new Intl.DateTimeFormat("en-PH", {
  weekday: "short",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

const STATUS_LABEL: Record<string, string> = {
  hold: "Hold",
  confirmed: "Confirmed",
  checked_in: "In-house",
  checked_out: "Checked out",
};

function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function nights(start: string, end: string) {
  return Math.round(
    (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) /
      86_400_000,
  );
}

/** The grid's dates: whole weeks from the Sunday on or before the 1st. */
function gridDays(month: string) {
  const first = `${month}-01`;
  const weekday = new Date(`${first}T00:00:00Z`).getUTCDay();
  const start = addDays(first, -weekday);
  const next = new Date(`${month}-01T00:00:00Z`);
  next.setUTCMonth(next.getUTCMonth() + 1);
  const lastDay = addDays(next.toISOString().slice(0, 10), -1);
  const lastWeekday = new Date(`${lastDay}T00:00:00Z`).getUTCDay();
  const end = addDays(lastDay, 6 - lastWeekday);
  const days: string[] = [];
  for (let day = start; day <= end; day = addDays(day, 1)) days.push(day);
  return days;
}

type Role = "arriving" | "leaving" | "staying" | "holding" | "blocked";
const ROLE_ORDER: Role[] = [
  "arriving",
  "leaving",
  "staying",
  "holding",
  "blocked",
];
const ROLE_TITLE: Record<Role, string> = {
  arriving: "Arriving",
  leaving: "Leaving",
  staying: "Staying",
  holding: "On hold",
  blocked: "Blocked",
};

function roleOn(event: PhoneEvent, day: string): Role | null {
  if (event.kind === "block" || event.kind === "unavailable")
    return day >= event.startDate && day < event.endDate ? "blocked" : null;
  if (day === event.startDate)
    return event.kind === "hold" ? "holding" : "arriving";
  if (day === event.endDate && event.kind !== "hold") return "leaving";
  if (day > event.startDate && day < event.endDate)
    return event.kind === "hold" ? "holding" : "staying";
  return null;
}

function swatch(event: PhoneEvent) {
  return barStyle(event as unknown as DisplayCalendarEvent);
}

export function MobileMonth({
  month,
  monthLabel,
  today,
  events,
  previousHref,
  nextHref,
  todayHref,
  viewSwitcher,
  unitId,
  canBook,
  children,
}: {
  month: string;
  monthLabel: string;
  today: string;
  events: PhoneEvent[];
  previousHref: string;
  nextHref: string;
  todayHref: string;
  viewSwitcher: ReactNode;
  /** The unit a new booking starts on, when one unit is selected. */
  unitId?: string;
  canBook: boolean;
  /** Shown under the agenda, e.g. today's arrivals and tasks. */
  children?: ReactNode;
}) {
  const days = useMemo(() => gridDays(month), [month]);
  const [selected, setSelected] = useState(() =>
    today.startsWith(month) ? today : `${month}-01`,
  );
  // Landing on another month moves the selection into it.
  const [shownMonth, setShownMonth] = useState(month);
  if (shownMonth !== month) {
    setShownMonth(month);
    setSelected(today.startsWith(month) ? today : `${month}-01`);
  }

  const byDay = useMemo(() => {
    const map = new Map<string, PhoneEvent[]>();
    for (const day of days) {
      const covering = events.filter(
        (event) => day >= event.startDate && day < event.endDate,
      );
      if (covering.length) map.set(day, covering);
    }
    return map;
  }, [days, events]);

  const agenda = ROLE_ORDER.map((role) => ({
    role,
    items: events.filter((event) => roleOn(event, selected) === role),
  })).filter((group) => group.items.length);

  const bookHref = `/reservations/new?${new URLSearchParams({
    checkIn: selected,
    checkOut: addDays(selected, 1),
    ...(unitId ? { unit: unitId } : {}),
  })}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1">
        <Link
          href={previousHref}
          scroll={false}
          aria-label="Previous month"
          className="flex h-11 w-11 items-center justify-center rounded-full text-pine active:bg-pine-mist"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </Link>
        <h2 className="min-w-0 flex-1 truncate text-center font-display text-xl text-pine">
          {monthLabel}
        </h2>
        <Link
          href={nextHref}
          scroll={false}
          aria-label="Next month"
          className="flex h-11 w-11 items-center justify-center rounded-full text-pine active:bg-pine-mist"
        >
          <ChevronRight className="h-5 w-5" aria-hidden />
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1 [&>nav]:w-full [&_a]:flex-1 [&_a]:justify-center">
          {viewSwitcher}
        </div>
        <Link
          href={todayHref}
          scroll={false}
          className="flex h-9 shrink-0 items-center rounded-md px-3 text-sm font-semibold text-clay-deep active:bg-clay-mist"
        >
          Today
        </Link>
      </div>

      <section
        aria-label={`${monthLabel} calendar`}
        className={cn(MOBILE_CARD, "p-3")}
      >
        <div className="grid grid-cols-7 pb-1">
          {DAY_NAMES.map((name, index) => (
            <div
              key={index}
              className="py-1 text-center text-xs font-medium text-ink/50"
            >
              {name}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-1">
          {days.map((day) => {
            const inMonth = day.startsWith(month);
            const isToday = day === today;
            const isSelected = day === selected;
            const covering = byDay.get(day) ?? [];
            const shown = covering.slice(0, 3);
            return (
              <button
                key={day}
                type="button"
                onClick={() => setSelected(day)}
                aria-pressed={isSelected}
                aria-label={`${DAY_TITLE.format(new Date(`${day}T00:00:00Z`))}${covering.length ? `, ${covering.length} booked` : ""}`}
                className="flex h-14 flex-col items-center gap-1 rounded-2xl pt-1.5 outline-offset-0 active:bg-pine-mist"
              >
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-[15px] tabular-nums",
                    isSelected
                      ? "bg-pine font-semibold text-white"
                      : isToday
                        ? "bg-clay-mist font-semibold text-clay-deep"
                        : inMonth
                          ? "text-ink"
                          : "text-ink/30",
                  )}
                >
                  {Number(day.slice(-2))}
                </span>
                <span className="flex h-2 items-center gap-0.5" aria-hidden>
                  {shown.map((event) => {
                    const { className, style } = swatch(event);
                    return (
                      <span
                        key={event.id}
                        className={cn(
                          "h-2 w-2 rounded-full",
                          className,
                          !inMonth && "opacity-40",
                        )}
                        style={style}
                      />
                    );
                  })}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section aria-label="Selected day" className="space-y-3">
        <div className="flex items-center justify-between gap-3 px-1">
          <h3 className="font-display text-lg text-pine">
            {SHORT_TITLE.format(new Date(`${selected}T00:00:00Z`))}
            {selected === today ? (
              <span className="ml-2 rounded-full bg-clay-mist px-2 py-0.5 align-middle text-xs font-semibold text-clay-deep">
                Today
              </span>
            ) : null}
          </h3>
        </div>

        {agenda.length === 0 ? (
          <p
            className={cn(
              MOBILE_CARD,
              "px-5 py-8 text-center text-sm text-ink/60",
            )}
          >
            Nothing scheduled. This day is free.
            {canBook ? (
              <>
                {" "}
                <Link
                  href={bookHref}
                  className="font-semibold text-clay underline underline-offset-4"
                >
                  Book it
                </Link>
              </>
            ) : null}
          </p>
        ) : (
          agenda.map(({ role, items }) => (
            <div key={role} className="space-y-2">
              <p className="px-1 text-xs font-semibold uppercase tracking-wide text-ink/50">
                {ROLE_TITLE[role]} · {items.length}
              </p>
              {items.map((event) => (
                <AgendaCard
                  key={event.id}
                  event={event}
                  role={role}
                  day={selected}
                />
              ))}
            </div>
          ))
        )}
      </section>

      {children}
    </div>
  );
}

function AgendaCard({
  event,
  role,
  day,
}: {
  event: PhoneEvent;
  role: Role;
  day: string;
}) {
  const { className, style } = swatch(event);
  const total = nights(event.startDate, event.endDate);
  const meta =
    role === "arriving"
      ? `${total} night${total === 1 ? "" : "s"}`
      : role === "staying"
        ? `Night ${nights(event.startDate, day) + 1} of ${total}`
        : role === "leaving"
          ? "Checks out today"
          : role === "holding"
            ? `Hold · ${total} night${total === 1 ? "" : "s"}`
            : "Unit unavailable";
  const body = (
    <>
      <span
        aria-hidden
        className={cn("w-1.5 shrink-0 self-stretch rounded-full", className)}
        style={style}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-base font-semibold text-pine">
          {event.title}
        </span>
        <span className="block truncate text-sm text-ink/65">
          {event.unitLabel}
        </span>
        <span className="mt-1 block truncate text-xs text-ink/55">
          {meta}
          {event.timeLabel && role !== "staying" ? ` · ${event.timeLabel}` : ""}
          {event.platformName ? ` · ${event.platformName}` : ""}
        </span>
      </span>
      {event.status ? (
        <span className="shrink-0 self-start rounded-full bg-pine/[0.07] px-2.5 py-1 text-xs font-medium text-pine">
          {STATUS_LABEL[event.status]}
        </span>
      ) : null}
    </>
  );
  const classes = cn(
    MOBILE_CARD,
    "flex items-stretch gap-3 p-4 active:bg-pine-mist/60",
  );
  return event.href ? (
    <Link href={event.href} className={classes}>
      {body}
    </Link>
  ) : (
    <div className={classes}>{body}</div>
  );
}
