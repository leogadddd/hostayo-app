import Link from "next/link";
import type { Metadata } from "next";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpFromLine,
  BedDouble,
  BrushCleaning,
  CalendarCheck,
  CalendarDays,
  CircleCheck,
  Clock3,
  Hammer,
  Percent,
  Plus,
  ReceiptText,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonClassName } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireMembership } from "@/lib/auth/session";
import { can } from "@/lib/permissions";
import { calendarEventsForUnit, monthGridRange } from "@/lib/calendar";
import { seriesStart } from "@/lib/dashboard-series";
import {
  addDaysLocal,
  listNights,
  monthNightRange,
  nightsBetween,
  todayInTimeZone,
} from "@/lib/dates";
import { formatPHP } from "@/lib/money";
import { cn } from "@/lib/utils";
import {
  getOccupancySegments,
  listCalendarActivity,
  type OccupancySegment,
} from "@/server/inventory/availability";
import { extendedCheckoutTime } from "@/lib/extensions";
import {
  getExtensionHours,
  getPendingExtensionHours,
} from "@/server/reservations/extensions";
import { listOrgUnits, listProperties } from "@/server/inventory/service";
import { listTasks } from "@/server/operations/service";
import {
  getDashboardPlatformBreakdown,
  getDashboardSeries,
  listOpenDamage,
  listPendingProofs,
} from "@/server/reports/dashboard";
import { getReport } from "@/server/reports/service";
import { MiniCalendar, type MiniCalendarEvent } from "./mini-calendar";
import { NotesCard } from "./notes-card";
import { PerformanceSection } from "./performance";
import { PlatformBreakdown } from "./platform-breakdown";

export const metadata: Metadata = { title: "Dashboard" };

const MONTH_LABEL = new Intl.DateTimeFormat("en-PH", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const MONTH_ONLY = new Intl.DateTimeFormat("en-PH", {
  month: "long",
  timeZone: "UTC",
});
const DATE_LABEL = new Intl.DateTimeFormat("en-PH", {
  weekday: "long",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});
const SHORT_DATE = new Intl.DateTimeFormat("en-PH", {
  month: "short",
  day: "numeric",
  timeZone: "Asia/Manila",
});

const OCCUPIED_STATUSES = new Set(["confirmed", "checked_in", "checked_out"]);

function localTimeLabel(time: string) {
  const [hour, minute] = time.split(":");
  return `${Number(hour) % 12 || 12}:${minute} ${Number(hour) < 12 ? "AM" : "PM"}`;
}

/** "14:05" in the property's time zone, to compare with check-in/out times. */
function clockIn(timeZone: string) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone,
  }).format(new Date());
}

function greeting(timeZone: string) {
  const hour = Number(clockIn(timeZone).slice(0, 2));
  return hour < 12
    ? "Good morning"
    : hour < 18
      ? "Good afternoon"
      : "Good evening";
}

function plural(count: number, word: string, many = `${word}s`) {
  return `${count} ${count === 1 ? word : many}`;
}

/** Keep the operations dashboard up when a secondary query fails, but say why in the logs. */
function logAndSkip(label: string) {
  return (error: unknown) => {
    console.error(`Dashboard ${label} unavailable:`, error);
    return null;
  };
}

/** Occupied ÷ bookable nights this month on active units, blocked nights excluded. */
function monthOccupancy(
  units: readonly { id: string; status: string }[],
  segmentsByUnit: Map<string, OccupancySegment[]>,
  range: { start: string; end: string },
) {
  const nights = listNights(range.start, range.end);
  let occupied = 0;
  let bookable = 0;
  for (const unit of units) {
    if (unit.status !== "active") continue;
    const segments = segmentsByUnit.get(unit.id) ?? [];
    for (const night of nights) {
      const covers = (segment: OccupancySegment) =>
        segment.startDate <= night && night < segment.endDate;
      if (
        segments.some((segment) => segment.kind === "block" && covers(segment))
      )
        continue;
      bookable++;
      if (
        segments.some(
          (segment) =>
            segment.kind === "reservation" &&
            OCCUPIED_STATUSES.has(segment.status) &&
            covers(segment),
        )
      )
        occupied++;
    }
  }
  return { occupied, bookable, rate: bookable ? occupied / bookable : null };
}

export default async function DashboardPage() {
  const membership = await requireMembership();
  const [properties, units] = await Promise.all([
    listProperties(membership.organizationId),
    listOrgUnits(membership.organizationId),
  ]);

  const propertyById = new Map(
    properties.map((property) => [property.id, property]),
  );
  const unitById = new Map(units.map((unit) => [unit.id, unit]));
  const propertyForUnit = (unitId: string) =>
    propertyById.get(unitById.get(unitId)?.propertyId ?? "");
  const timezone = properties[0]?.timezone ?? "Asia/Manila";
  const today = todayInTimeZone(timezone);
  const unitDays = units.map((unit) => ({
    unitId: unit.id,
    today: todayInTimeZone(propertyForUnit(unit.id)?.timezone ?? timezone),
  }));
  const todayByUnit = new Map(
    unitDays.map((item) => [item.unitId, item.today]),
  );
  const month = today.slice(0, 7);
  const monthRange = monthNightRange(month);
  const monthGrid = monthGridRange(month);
  const monthName = MONTH_ONLY.format(new Date(`${month}-01T00:00:00Z`));
  // Revenue and balances are report figures.
  const showPerformance = can(membership, "reports.view");
  // Payment proofs and damage costs are money; staff see neither.
  const showMoney = can(membership, "payments.view");
  const canSeeReservations = can(membership, "reservations.view");
  const canSeeProperties = can(membership, "properties.view");

  const [
    activity,
    openTasks,
    monthSegmentsByUnit,
    series,
    monthReport,
    platformBreakdown,
    openDamage,
    pendingProofs,
  ] = await Promise.all([
    listCalendarActivity(membership.organizationId, unitDays),
    listTasks(membership.organizationId, { status: "open" }),
    getOccupancySegments(
      membership.organizationId,
      units.map((unit) => unit.id),
      monthGrid.start,
      monthGrid.end,
    ),
    showPerformance
      ? getDashboardSeries(membership.organizationId, {
          from: seriesStart(today),
          to: addDaysLocal(today, 1),
        }).catch(logAndSkip("performance series"))
      : null,
    showPerformance
      ? getReport(membership.organizationId, {
          from: monthRange.start,
          to: monthRange.end,
        }).catch(logAndSkip("month balances"))
      : null,
    getDashboardPlatformBreakdown(membership.organizationId, {
      from: monthRange.start,
      to: monthRange.end,
    }).catch(logAndSkip("platform breakdown")),
    listOpenDamage(membership.organizationId).catch(logAndSkip("open damage")),
    showMoney
      ? listPendingProofs(membership.organizationId).catch(
          logAndSkip("payment proofs"),
        )
      : null,
  ]);

  // Today's movements, including the ones already done, so the day reads as progress.
  const arrivals = activity.filter(
    (item) =>
      item.status !== "hold" && item.startDate === todayByUnit.get(item.unitId),
  );
  const departures = activity.filter(
    (item) =>
      item.status !== "hold" && item.endDate === todayByUnit.get(item.unitId),
  );
  // Approved late check-out pushes today's departures later; open requests
  // are flagged so someone approves or declines them (src/lib/extensions.ts).
  const [extensionHours, pendingExtensionHours] = await Promise.all([
    getExtensionHours(
      membership.organizationId,
      departures.map((item) => item.id),
    ).catch(logAndSkip("late check-outs")),
    getPendingExtensionHours(
      membership.organizationId,
      departures.map((item) => item.id),
    ).catch(logAndSkip("late check-out requests")),
  ]);
  const arrivalsDone = arrivals.filter(
    (item) => item.status === "checked_in" || item.status === "checked_out",
  ).length;
  const departuresDone = departures.filter(
    (item) => item.status === "checked_out",
  ).length;
  const holds = activity
    .filter((item) => item.status === "hold")
    .sort(
      (a, b) =>
        (a.expiresAt?.getTime() ?? Infinity) -
        (b.expiresAt?.getTime() ?? Infinity),
    );
  const expiryLabel = new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  });

  // A turnover blocks today's arrival until it's done.
  const waitingArrivalUnitIds = new Set(
    arrivals
      .filter((item) => item.status === "confirmed")
      .map((item) => item.unitId),
  );
  const urgentTasks = openTasks.filter((task) =>
    waitingArrivalUnitIds.has(task.unitId),
  );
  const otherTasks = openTasks.filter(
    (task) => !waitingArrivalUnitIds.has(task.unitId),
  );

  const monthSegments = [...monthSegmentsByUnit.values()].flat();
  // Confirmed stays (not holds) checking in this month, and their nights in it.
  const monthBookings = monthSegments.filter(
    (segment) =>
      segment.kind === "reservation" &&
      segment.status !== "hold" &&
      segment.startDate >= monthRange.start &&
      segment.startDate < monthRange.end,
  );
  const monthBookedNights = monthBookings.reduce(
    (sum, segment) =>
      sum +
      nightsBetween(
        segment.startDate,
        segment.endDate < monthRange.end ? segment.endDate : monthRange.end,
      ),
    0,
  );
  const inHouse = monthSegments.filter(
    (segment): segment is Extract<OccupancySegment, { kind: "reservation" }> =>
      segment.kind === "reservation" && segment.status === "checked_in",
  );
  const inHouseGuests = inHouse.reduce(
    (sum, stay) => sum + (stay.guestCount ?? 0),
    0,
  );
  const occupancy = monthOccupancy(units, monthSegmentsByUnit, monthRange);

  const damage = openDamage ?? [];
  const damageEstimate = damage.reduce(
    (sum, report) => sum + (report.estimatedAmountCents ?? 0),
    0,
  );
  const proofs = pendingProofs ?? [];

  const unitLabel = (unitId: string) => {
    const unit = unitById.get(unitId);
    return properties.length > 1
      ? `${propertyForUnit(unitId)?.name} · ${unit?.name}`
      : (unit?.name ?? "");
  };

  // Stays, holds and blocks for this month's grid; turnovers stay on the full calendar.
  const miniCalendarEvents: MiniCalendarEvent[] = units.flatMap((unit) =>
    calendarEventsForUnit(
      unit.id,
      monthSegmentsByUnit.get(unit.id) ?? [],
    ).flatMap((event): MiniCalendarEvent[] => {
      if (event.kind === "turnover") return [];
      const blocked = event.kind === "block" || event.kind === "unavailable";
      return [
        {
          id: event.id,
          startDate: event.startDate,
          endDate: event.endDate,
          title: blocked ? (event.description ?? event.title) : event.title,
          unitLabel: unitLabel(unit.id),
          tone: blocked
            ? "blocked"
            : event.kind === "hold"
              ? "hold"
              : event.status === "checked_in"
                ? "in-house"
                : event.status === "checked_out"
                  ? "checked-out"
                  : "confirmed",
          href: event.reservationId
            ? `/reservations/${event.reservationId}`
            : canSeeProperties
              ? `/properties/${unit.propertyId}/units/${unit.id}`
              : undefined,
        },
      ];
    }),
  );

  const tiles: {
    label: string;
    value: string;
    helper: string;
    icon: LucideIcon;
    tone: string;
    href: string;
  }[] = [
    {
      label: "Arriving today",
      value: String(arrivals.length),
      helper: arrivals.length
        ? `${arrivalsDone} of ${arrivals.length} checked in`
        : "No arrivals today",
      icon: ArrowDownToLine,
      tone: "bg-sage/55 text-pine",
      href: "/calendar",
    },
    {
      label: "Checking out today",
      value: String(departures.length),
      helper: departures.length
        ? `${departuresDone} of ${departures.length} checked out`
        : "No check-outs today",
      icon: ArrowUpFromLine,
      tone: "bg-clay-mist text-clay-deep",
      href: "/calendar",
    },
    {
      label: "In house now",
      value: String(inHouse.length),
      helper: inHouse.length
        ? `${plural(inHouseGuests, "guest")} staying`
        : "No guests staying",
      icon: BedDouble,
      tone: "bg-pine-mist text-pine",
      href: "/reservations?status=checked_in",
    },
    {
      label: "Turnovers to do",
      value: String(openTasks.length),
      helper: urgentTasks.length
        ? `${urgentTasks.length} before today’s arrivals`
        : openTasks.length
          ? "None block today’s arrivals"
          : "Every unit is ready",
      icon: BrushCleaning,
      tone: urgentTasks.length ? "bg-clay text-white" : "bg-sand text-bark",
      href: "/tasks?status=open",
    },
    {
      label: `Bookings in ${monthName}`,
      value: String(monthBookings.length),
      helper: monthBookings.length
        ? `${plural(monthBookedNights, "night")} booked`
        : "No bookings yet",
      icon: CalendarDays,
      tone: "bg-sage/55 text-pine",
      href: `/calendar?month=${month}`,
    },
    {
      label: `Occupancy in ${monthName}`,
      value:
        occupancy.rate === null ? "—" : `${Math.round(occupancy.rate * 100)}%`,
      helper: occupancy.bookable
        ? `${occupancy.occupied} of ${plural(occupancy.bookable, "night")}`
        : "No active units",
      icon: Percent,
      tone: "bg-pine-mist text-pine",
      href: `/calendar?month=${month}`,
    },
  ];

  const attentionCount =
    urgentTasks.length +
    otherTasks.length +
    holds.length +
    damage.length +
    proofs.length;
  const remainingMoves =
    arrivals.length - arrivalsDone + departures.length - departuresDone;
  const summary = [
    remainingMoves
      ? plural(remainingMoves, "guest movement") + " left today"
      : null,
    openTasks.length ? plural(openTasks.length, "turnover") : null,
    holds.length ? plural(holds.length, "hold") : null,
    damage.length ? plural(damage.length, "damage report") : null,
  ].filter(Boolean);

  return (
    <div className="mx-auto max-w-[1600px] overflow-hidden pb-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-5">
        <div>
          <h1 className="mt-2 font-display text-3xl tracking-tight text-pine sm:text-[2.6rem] sm:leading-tight">
            {greeting(timezone)}, {membership.organizationName}
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-ink/60">
            {summary.length
              ? `${summary.join(", ")}.`
              : "A calm day. Nothing needs your attention right now."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/calendar/availability"
            className={buttonClassName("ghost", "md")}
          >
            <CalendarCheck className="h-4 w-4" aria-hidden />
            Check availability
          </Link>
          {can(membership, "reservations.create") ? (
            <Link
              href="/reservations/new"
              className={buttonClassName("clay", "md")}
            >
              <Plus className="h-4 w-4" aria-hidden />
              New reservation
            </Link>
          ) : null}
        </div>
      </header>

      {units.length === 0 ? (
        <EmptyState
          title="Your operations dashboard is ready"
          description={
            can(membership, "properties.create")
              ? "Add your first property and unit to start tracking arrivals, cleaning work, occupancy and cash movement."
              : "Ask an owner or admin to add the first property and unit."
          }
          action={
            can(membership, "properties.create") ? (
              <Link
                href="/properties/new"
                className={buttonClassName("clay", "md")}
              >
                Add a property
              </Link>
            ) : undefined
          }
        />
      ) : (
        <>
          {/* 1 · At a glance */}
          <section
            aria-label="At a glance"
            className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-6"
          >
            {tiles.map(({ label, value, helper, icon: Icon, tone, href }) => (
              <Link
                key={label}
                href={href}
                className="group flex flex-col rounded-xl border border-pine/12 bg-linen p-4 shadow-[0_2px_8px_rgba(32,58,53,0.035)] transition hover:-translate-y-0.5 hover:border-pine/25 hover:shadow-[0_10px_24px_rgba(32,58,53,0.08)]"
              >
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                      tone,
                    )}
                  >
                    <Icon className="h-4 w-4" strokeWidth={1.8} aria-hidden />
                  </span>
                  <ArrowRight
                    className="h-4 w-4 shrink-0 text-ink/20 transition group-hover:translate-x-0.5 group-hover:text-clay"
                    aria-hidden
                  />
                </div>
                <p className="mt-3 font-display text-3xl leading-none tabular-nums text-pine">
                  {value}
                </p>
                <p className="mt-1.5 text-xs font-medium text-ink/65">
                  {label}
                </p>
                <p className="mt-auto truncate pt-2 text-[11px] text-ink/45">
                  {helper}
                </p>
              </Link>
            ))}
          </section>

          {/* 2 · Today: who comes, who leaves, what's waiting */}
          <section className="mt-5 grid grid-cols-[minmax(0,1fr)] items-stretch gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(20rem,1fr)]">
            <Card className="flex flex-col">
              <CardHeader className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-display text-xl text-pine">
                    Today&apos;s schedule
                  </h2>
                  <p className="mt-1 text-xs text-ink/50">
                    Who&apos;s leaving and who&apos;s coming, in the order it
                    happens.
                  </p>
                </div>
                <Badge tone="neutral">
                  {plural(arrivals.length + departures.length, "movement")}
                </Badge>
              </CardHeader>
              {arrivals.length + departures.length === 0 ? (
                <CardBody className="flex flex-col items-center justify-center py-12 text-center">
                  <CircleCheck className="h-7 w-7 text-sage-deep" aria-hidden />
                  <p className="mt-2 text-sm text-ink/60">
                    No arrivals or departures today.
                  </p>
                  <p className="mt-1 max-w-sm text-xs text-ink/45">
                    Use the quiet window to clear turnover work and follow up on
                    holds.
                  </p>
                </CardBody>
              ) : (
                <div className="grid divide-y divide-pine/10 md:grid-cols-2 md:divide-x md:divide-y-0">
                  <ScheduleColumn
                    title="Checking out"
                    icon={ArrowUpFromLine}
                    iconTone="bg-clay-mist text-clay-deep"
                    empty="No check-outs scheduled"
                    progress={
                      departures.length
                        ? `${departuresDone}/${departures.length} done`
                        : null
                    }
                    rows={departures
                      .map((stay) => {
                        const property = propertyForUnit(stay.unitId);
                        const lateHours = extensionHours?.get(stay.id) ?? 0;
                        const baseTime = property?.checkOutTime ?? null;
                        // An extension counts from the unit's own check-out time.
                        const time = lateHours
                          ? extendedCheckoutTime(
                              unitById.get(stay.unitId)?.checkOutTime ??
                                baseTime ??
                                "11:00",
                              lateHours,
                            )
                          : baseTime;
                        const done = stay.status === "checked_out";
                        const late =
                          !done &&
                          time !== null &&
                          clockIn(property?.timezone ?? timezone) > time;
                        return {
                          id: stay.id,
                          time,
                          guestName: stay.guestName,
                          detail: `${unitLabel(stay.unitId)} · ${plural(stay.guestCount, "guest")}${lateHours ? ` · late check-out +${lateHours}h` : ""}${!done && pendingExtensionHours?.get(stay.id) ? ` · asked for +${pendingExtensionHours.get(stay.id)}h, awaiting approval` : ""}`,
                          status: done
                            ? ({ label: "Checked out", tone: "done" } as const)
                            : late
                              ? ({ label: "Overdue", tone: "late" } as const)
                              : ({ label: "Due", tone: "due" } as const),
                          href: `/reservations/${stay.id}`,
                        };
                      })
                      .sort((a, b) =>
                        (a.time ?? "").localeCompare(b.time ?? ""),
                      )}
                  />
                  <ScheduleColumn
                    title="Arriving"
                    icon={ArrowDownToLine}
                    iconTone="bg-sage/60 text-pine"
                    empty="No arrivals scheduled"
                    progress={
                      arrivals.length
                        ? `${arrivalsDone}/${arrivals.length} done`
                        : null
                    }
                    rows={arrivals
                      .map((stay) => {
                        const property = propertyForUnit(stay.unitId);
                        const time = property?.checkInTime ?? null;
                        const done =
                          stay.status === "checked_in" ||
                          stay.status === "checked_out";
                        const notReady =
                          !done &&
                          urgentTasks.some(
                            (task) => task.unitId === stay.unitId,
                          );
                        const waiting =
                          !done &&
                          time !== null &&
                          clockIn(property?.timezone ?? timezone) > time;
                        return {
                          id: stay.id,
                          time,
                          guestName: stay.guestName,
                          detail: `${unitLabel(stay.unitId)} · ${plural(stay.guestCount, "guest")}`,
                          status: done
                            ? ({ label: "Checked in", tone: "done" } as const)
                            : notReady
                              ? ({
                                  label: "Unit not ready",
                                  tone: "late",
                                } as const)
                              : waiting
                                ? ({
                                    label: "Awaiting guest",
                                    tone: "waiting",
                                  } as const)
                                : ({ label: "Expected", tone: "due" } as const),
                          href: `/reservations/${stay.id}`,
                        };
                      })
                      .sort((a, b) =>
                        (a.time ?? "").localeCompare(b.time ?? ""),
                      )}
                  />
                </div>
              )}
            </Card>

            <Card className="flex flex-col">
              <CardHeader className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl text-pine">
                    Needs attention
                  </h2>
                  <p className="mt-1 text-xs text-ink/50">
                    What&apos;s waiting on you, most urgent first.
                  </p>
                </div>
                {attentionCount ? (
                  <Badge tone="clay">{attentionCount}</Badge>
                ) : (
                  <Badge tone="sage">All clear</Badge>
                )}
              </CardHeader>
              {attentionCount === 0 ? (
                <CardBody className="flex flex-col items-center justify-center py-10 text-center">
                  <CircleCheck className="h-7 w-7 text-sage-deep" aria-hidden />
                  <p className="mt-2 text-sm text-ink/60">
                    Nothing is waiting on you.
                  </p>
                  <p className="mt-1 text-xs text-ink/45">
                    Every unit is ready and no holds, damage or payments need a
                    look.
                  </p>
                </CardBody>
              ) : (
                <ul className="divide-y divide-pine/8">
                  {urgentTasks.map((task) => (
                    <AttentionRow
                      key={task.id}
                      href={`/tasks/${task.id}`}
                      icon={BrushCleaning}
                      tone="urgent"
                      title={`Turn over ${unitLabel(task.unitId)}`}
                      detail={`Guest arrives today · ${task.doneItems}/${task.totalItems} done`}
                      progress={
                        task.totalItems ? task.doneItems / task.totalItems : 0
                      }
                    />
                  ))}
                  {otherTasks.length ? (
                    <AttentionRow
                      href="/tasks?status=open"
                      icon={BrushCleaning}
                      tone="normal"
                      title={plural(otherTasks.length, "other turnover")}
                      detail={
                        otherTasks
                          .slice(0, 3)
                          .map((task) => unitLabel(task.unitId))
                          .join(", ") + (otherTasks.length > 3 ? "…" : "")
                      }
                    />
                  ) : null}
                  {holds.slice(0, 3).map((hold) => (
                    <AttentionRow
                      key={hold.id}
                      href={`/reservations/${hold.id}`}
                      icon={Clock3}
                      tone="normal"
                      title={`Hold for ${hold.guestName}`}
                      detail={`${unitLabel(hold.unitId)} · ${hold.expiresAt ? `expires ${expiryLabel.format(hold.expiresAt)}` : "no expiry"}`}
                    />
                  ))}
                  {holds.length > 3 ? (
                    <AttentionRow
                      href="/reservations?status=hold"
                      icon={Clock3}
                      tone="normal"
                      title={`${holds.length - 3} more holds`}
                      detail="Waiting for payment"
                    />
                  ) : null}
                  {proofs.length ? (
                    <AttentionRow
                      href={
                        proofs.length === 1 && canSeeReservations
                          ? `/reservations/${proofs[0]!.reservationId}`
                          : "/reservations"
                      }
                      icon={ReceiptText}
                      tone="normal"
                      title={`${plural(proofs.length, "payment proof")} to review`}
                      detail={
                        proofs
                          .slice(0, 2)
                          .map((proof) => proof.guestName)
                          .join(", ") + (proofs.length > 2 ? "…" : "")
                      }
                    />
                  ) : null}
                  {damage.length ? (
                    <AttentionRow
                      href="#damage"
                      icon={Hammer}
                      tone="normal"
                      title={`${plural(damage.length, "open damage report")}`}
                      detail={
                        damage
                          .slice(0, 2)
                          .map((report) => report.unitName)
                          .join(", ") +
                        (damage.length > 2 ? "…" : "") +
                        (showMoney && damageEstimate
                          ? ` · about ${formatPHP(damageEstimate)}`
                          : "")
                      }
                    />
                  ) : null}
                </ul>
              )}
            </Card>
          </section>

          {/* 3 · This month, plus a scratchpad */}
          <section className="mt-5 grid grid-cols-[minmax(0,1fr)] items-stretch gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(20rem,1fr)]">
            <MiniCalendar
              month={month}
              today={today}
              monthLabel={MONTH_LABEL.format(new Date(`${month}-01T00:00:00Z`))}
              gridStart={monthGrid.start}
              gridEnd={monthGrid.end}
              events={miniCalendarEvents}
            />
            <NotesCard
              organizationId={membership.organizationId}
              userId={membership.userId}
              className="flex flex-col"
            />
          </section>

          {/* 4 · Where bookings come from, and what's broken */}
          <section className="mt-5 grid grid-cols-[minmax(0,1fr)] items-stretch gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(20rem,1fr)]">
            <PlatformBreakdown
              className="flex flex-col"
              monthLabel={MONTH_LABEL.format(new Date(`${month}-01T00:00:00Z`))}
              platforms={platformBreakdown}
            />
            <Card id="damage" className="flex scroll-mt-24 flex-col">
              <CardHeader className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl text-pine">
                    Damage reports
                  </h2>
                  <p className="mt-1 text-xs text-ink/50">
                    Open reports waiting to be fixed or charged.
                  </p>
                </div>
                {damage.length ? (
                  <Badge tone="clay">{damage.length} open</Badge>
                ) : null}
              </CardHeader>
              {openDamage === null ? (
                <CardBody>
                  <p className="text-sm text-ink/55">
                    Damage reports are temporarily unavailable.
                  </p>
                </CardBody>
              ) : damage.length === 0 ? (
                <CardBody className="flex flex-1 flex-col items-center justify-center py-10 text-center">
                  <CircleCheck className="h-7 w-7 text-sage-deep" aria-hidden />
                  <p className="mt-2 text-sm text-ink/60">No open damage.</p>
                  <p className="mt-1 text-xs text-ink/45">
                    Every unit is in one piece.
                  </p>
                </CardBody>
              ) : (
                <>
                  <ul className="flex-1 divide-y divide-pine/8">
                    {damage.slice(0, 5).map((report) => {
                      const href =
                        report.reservationId && canSeeReservations
                          ? `/reservations/${report.reservationId}`
                          : canSeeProperties
                            ? `/properties/${report.propertyId}/units/${report.unitId}`
                            : null;
                      const body = (
                        <>
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-clay-mist text-clay-deep">
                            <AlertTriangle className="h-4 w-4" aria-hidden />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-pine">
                              {report.description}
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-ink/55">
                              {properties.length > 1
                                ? `${report.propertyName} · `
                                : ""}
                              {report.unitName} ·{" "}
                              {SHORT_DATE.format(report.createdAt)}
                            </span>
                          </span>
                          {showMoney ? (
                            <span className="shrink-0 text-sm tabular-nums text-clay-deep">
                              {report.estimatedAmountCents !== null ? (
                                formatPHP(report.estimatedAmountCents)
                              ) : (
                                <span className="text-xs text-ink/40">
                                  No estimate
                                </span>
                              )}
                            </span>
                          ) : null}
                        </>
                      );
                      return (
                        <li key={report.id}>
                          {href ? (
                            <Link
                              href={href}
                              className="flex items-center gap-3 px-6 py-3 transition hover:bg-pine-mist/40"
                            >
                              {body}
                            </Link>
                          ) : (
                            <div className="flex items-center gap-3 px-6 py-3">
                              {body}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                  {showMoney || damage.length > 5 ? (
                    <div className="flex items-center justify-between border-t border-pine/10 bg-paper/50 px-6 py-3 text-xs text-ink/55">
                      <span>
                        {damage.length > 5
                          ? `${damage.length - 5} more not shown`
                          : "Estimated total"}
                      </span>
                      {showMoney ? (
                        <span className="font-medium tabular-nums text-pine">
                          {formatPHP(damageEstimate)}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </>
              )}
            </Card>
          </section>

          {/* 5 · Money and trends */}
          {showPerformance ? (
            series ? (
              <PerformanceSection
                series={series}
                today={today}
                balances={
                  monthReport
                    ? {
                        depositsHeldCents:
                          monthReport.summary.depositsHeldCents,
                        bookedValueCents: monthReport.summary.bookedValueCents,
                        month,
                      }
                    : null
                }
              />
            ) : (
              <Card className="mt-10">
                <CardBody>
                  <p className="text-sm text-ink/60">
                    Performance charts are temporarily unavailable. Your
                    operations overview above is still current.
                  </p>
                </CardBody>
              </Card>
            )
          ) : null}
        </>
      )}
    </div>
  );
}

type ScheduleStatus = {
  label: string;
  tone: "done" | "due" | "late" | "waiting";
};

const STATUS_STYLE: Record<ScheduleStatus["tone"], string> = {
  done: "bg-sage/60 text-pine",
  due: "bg-pine-mist text-pine",
  waiting: "bg-sand text-bark",
  late: "bg-clay-mist text-clay-deep",
};

function ScheduleColumn({
  title,
  icon: Icon,
  iconTone,
  empty,
  progress,
  rows,
}: {
  title: string;
  icon: LucideIcon;
  iconTone: string;
  empty: string;
  progress: string | null;
  rows: {
    id: string;
    time: string | null;
    guestName: string;
    detail: string;
    status: ScheduleStatus;
    href: string;
  }[];
}) {
  return (
    <div className="min-w-0 px-4 py-4 sm:px-5">
      <div className="mb-2 flex items-center justify-between gap-3 px-1">
        <p className="flex items-center gap-2 text-sm font-semibold text-pine">
          <span
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full",
              iconTone,
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
          </span>
          {title}
        </p>
        {progress ? (
          <span className="text-xs tabular-nums text-ink/50">{progress}</span>
        ) : null}
      </div>
      {rows.length === 0 ? (
        <p className="px-1 py-6 text-center text-xs text-ink/45">{empty}</p>
      ) : (
        <ul className="space-y-1">
          {rows.map((row) => (
            <li key={row.id}>
              <Link
                href={row.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-pine-mist/45",
                  row.status.tone === "done" && "opacity-70",
                )}
              >
                <span className="w-16 shrink-0 text-right text-xs font-semibold tabular-nums text-pine">
                  {row.time ? localTimeLabel(row.time) : "—"}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block truncate text-sm font-medium text-pine",
                      row.status.tone === "done" &&
                        "line-through decoration-pine/30",
                    )}
                  >
                    {row.guestName}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-ink/55">
                    {row.detail}
                  </span>
                </span>
                <span
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                    STATUS_STYLE[row.status.tone],
                  )}
                >
                  {row.status.tone === "done" ? (
                    <CircleCheck className="h-3 w-3" aria-hidden />
                  ) : null}
                  {row.status.label}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AttentionRow({
  href,
  icon: Icon,
  tone,
  title,
  detail,
  progress,
}: {
  href: string;
  icon: LucideIcon;
  tone: "urgent" | "normal";
  title: string;
  detail: string;
  progress?: number;
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-center gap-3 px-6 py-3 transition hover:bg-pine-mist/40"
      >
        <span
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
            tone === "urgent" ? "bg-clay text-white" : "bg-pine-mist text-pine",
          )}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-pine">
            {title}
          </span>
          <span className="mt-0.5 block truncate text-xs text-ink/55">
            {detail}
          </span>
          {progress !== undefined ? (
            <span
              className="mt-1.5 block h-1 overflow-hidden rounded-full bg-pine-mist"
              aria-hidden
            >
              <span
                className="block h-full rounded-full bg-clay"
                style={{ width: `${progress * 100}%` }}
              />
            </span>
          ) : null}
        </span>
        <ArrowRight className="h-4 w-4 shrink-0 text-ink/25" aria-hidden />
      </Link>
    </li>
  );
}
