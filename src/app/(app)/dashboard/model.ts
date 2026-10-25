import { formatPHP } from "@/lib/money";
import {
  ArrowLineDown as ArrowDownToLine,
  ArrowLineUp as ArrowUpFromLine,
  Bed as BedDouble,
  Broom as BrushCleaning,
  CalendarDots as CalendarDays,
  Percent,
  type PhosphorIcon,
} from "@/components/ui/icons";
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
import { getGoLiveChecklist } from "@/server/orgs/checklist";
import { listTasks } from "@/server/operations/service";
import {
  getDashboardPlatformBreakdown,
  getDashboardSeries,
  listOpenDamage,
  listPendingProofs,
} from "@/server/reports/dashboard";
import { getReport } from "@/server/reports/service";
import { listExpenses } from "@/server/expenses/service";
import { type MiniCalendarEvent } from "./mini-calendar";
import { type ExpenseCategoryRow } from "./expense-breakdown";
import type { MembershipContext } from "@/lib/auth/session";

export const MONTH_LABEL = new Intl.DateTimeFormat("en-PH", {
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
export const SHORT_DATE = new Intl.DateTimeFormat("en-PH", {
  month: "short",
  day: "numeric",
  timeZone: "Asia/Manila",
});

const OCCUPIED_STATUSES = new Set(["confirmed", "checked_in", "checked_out"]);

export function localTimeLabel(time: string) {
  const [hour, minute] = time.split(":");
  return `${Number(hour) % 12 || 12}:${minute} ${Number(hour) < 12 ? "AM" : "PM"}`;
}

/** "14:05" in the property's time zone, to compare with check-in/out times. */
export function clockIn(timeZone: string) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone,
  }).format(new Date());
}

export type DayPeriod = "morning" | "afternoon" | "evening";

export function dayPeriod(timeZone: string): DayPeriod {
  const hour = Number(clockIn(timeZone).slice(0, 2));
  return hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
}

export function greeting(timeZone: string) {
  return `Good ${dayPeriod(timeZone)}`;
}

export function plural(count: number, word: string, many = `${word}s`) {
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

export type ScheduleStatus = {
  label: string;
  tone: "done" | "due" | "late" | "waiting";
};

/** One arrival or departure on today's schedule. */
export type ScheduleRow = {
  id: string;
  /** "HH:MM" at the property, or null when it has no set time. */
  time: string | null;
  guestName: string;
  detail: string;
  status: ScheduleStatus;
  href: string;
};

export type AttentionItem = {
  key: string;
  href: string;
  kind: "turnover" | "hold" | "proof" | "damage";
  tone: "urgent" | "normal";
  title: string;
  detail: string;
  /** 0 to 1, for a task's checklist. */
  progress?: number;
};

/** Everything the dashboard shows, loaded and worked out once for both layouts. */
export async function getDashboardModel(membership: MembershipContext) {
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
  const showExpenses = can(membership, "expenses.view");

  const [
    activity,
    openTasks,
    monthSegmentsByUnit,
    series,
    monthReport,
    platformBreakdown,
    openDamage,
    pendingProofs,
    monthExpenses,
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
    showExpenses
      ? listExpenses(membership.organizationId, { month }).catch(
          logAndSkip("month expenses"),
        )
      : null,
  ]);

  // This month's spending by category, largest first; voided entries don't count.
  let expenseCategories: ExpenseCategoryRow[] | null = null;
  if (monthExpenses) {
    const byCategory = new Map<string, number>();
    for (const expense of monthExpenses) {
      if (expense.voidedAt) continue;
      byCategory.set(
        expense.category,
        (byCategory.get(expense.category) ?? 0) + expense.amountCents,
      );
    }
    expenseCategories = [...byCategory.entries()]
      .map(([category, amountCents]) => ({ category, amountCents }))
      .sort((a, b) => b.amountCents - a.amountCents);
  }

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
    id:
      | "arrivals"
      | "departures"
      | "inHouse"
      | "turnovers"
      | "bookings"
      | "occupancy";
    label: string;
    value: string;
    helper: string;
    icon: PhosphorIcon;
    tone: string;
    href: string;
  }[] = [
    {
      id: "arrivals",
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
      id: "departures",
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
      id: "inHouse",
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
      id: "turnovers",
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
      id: "bookings",
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
      id: "occupancy",
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

  // What is waiting on someone, most urgent first.
  const attentionItems: AttentionItem[] = [
    ...urgentTasks.map((task): AttentionItem => ({
      key: task.id,
      href: `/tasks/${task.id}`,
      kind: "turnover",
      tone: "urgent",
      title: `Turn over ${unitLabel(task.unitId)}`,
      detail: `Guest arrives today · ${task.doneItems}/${task.totalItems} done`,
      progress: task.totalItems ? task.doneItems / task.totalItems : 0,
    })),
    ...(otherTasks.length
      ? [
          {
            key: "other-turnovers",
            href: "/tasks?status=open",
            kind: "turnover",
            tone: "normal",
            title: plural(otherTasks.length, "other turnover"),
            detail:
              otherTasks
                .slice(0, 3)
                .map((task) => unitLabel(task.unitId))
                .join(", ") + (otherTasks.length > 3 ? "…" : ""),
          } satisfies AttentionItem,
        ]
      : []),
    ...holds.slice(0, 3).map((hold): AttentionItem => ({
      key: hold.id,
      href: `/reservations/${hold.id}`,
      kind: "hold",
      tone: "normal",
      title: `Hold for ${hold.guestName}`,
      detail: `${unitLabel(hold.unitId)} · ${hold.expiresAt ? `expires ${expiryLabel.format(hold.expiresAt)}` : "no expiry"}`,
    })),
    ...(holds.length > 3
      ? [
          {
            key: "more-holds",
            href: "/reservations?status=hold",
            kind: "hold",
            tone: "normal",
            title: `${holds.length - 3} more holds`,
            detail: "Waiting for payment",
          } satisfies AttentionItem,
        ]
      : []),
    ...(proofs.length
      ? [
          {
            key: "proofs",
            href:
              proofs.length === 1 && canSeeReservations
                ? `/reservations/${proofs[0]!.reservationId}`
                : "/reservations",
            kind: "proof",
            tone: "normal",
            title: `${plural(proofs.length, "payment proof")} to review`,
            detail:
              proofs
                .slice(0, 2)
                .map((proof) => proof.guestName)
                .join(", ") + (proofs.length > 2 ? "…" : ""),
          } satisfies AttentionItem,
        ]
      : []),
    ...(damage.length
      ? [
          {
            key: "damage",
            href: "#damage",
            kind: "damage",
            tone: "normal",
            title: plural(damage.length, "open damage report"),
            detail:
              damage
                .slice(0, 2)
                .map((report) => report.unitName)
                .join(", ") +
              (damage.length > 2 ? "…" : "") +
              (showMoney && damageEstimate
                ? ` · about ${formatPHP(damageEstimate)}`
                : ""),
          } satisfies AttentionItem,
        ]
      : []),
  ];

  const departureRows: ScheduleRow[] = departures
    .map((stay) => {
      const property = propertyForUnit(stay.unitId);
      const lateHours = extensionHours?.get(stay.id) ?? 0;
      const baseTime = property?.checkOutTime ?? null;
      // An extension counts from the unit's own check-out time.
      const time = lateHours
        ? extendedCheckoutTime(
            unitById.get(stay.unitId)?.checkOutTime ?? baseTime ?? "11:00",
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
    .sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));

  const arrivalRows: ScheduleRow[] = arrivals
    .map((stay) => {
      const property = propertyForUnit(stay.unitId);
      const time = property?.checkInTime ?? null;
      const done =
        stay.status === "checked_in" || stay.status === "checked_out";
      const notReady =
        !done && urgentTasks.some((task) => task.unitId === stay.unitId);
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
    .sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));

  return {
    membership,
    units,
    properties,
    timezone,
    today,
    month,
    monthName,
    monthGrid,
    tiles,
    summary,
    arrivals,
    departures,
    arrivalsDone,
    departuresDone,
    departureRows,
    arrivalRows,
    openTasks,
    urgentTasks,
    otherTasks,
    holds,
    proofs,
    damage,
    openDamage,
    damageEstimate,
    attentionCount,
    attentionItems,
    unitLabel,
    expiryLabel,
    miniCalendarEvents,
    platformBreakdown,
    expenseCategories,
    series,
    monthReport,
    occupancy,
    monthBookings,
    monthBookedNights,
    inHouse,
    inHouseGuests,
    showExpenses,
    showPerformance,
    showMoney,
    canSeeReservations,
    canSeeProperties,
    canCreateReservation: can(membership, "reservations.create"),
    canCreateProperty: can(membership, "properties.create"),
    goLive: can(membership, "organization.update")
      ? await getGoLiveChecklist(membership.organizationId)
      : null,
  };
}

export type DashboardModel = Awaited<ReturnType<typeof getDashboardModel>>;
