import { extendedCheckoutTime } from "@/lib/extensions";
import { getExtensionHours } from "@/server/reservations/extensions";
import { unitOrPropertyPhotoSrc } from "@/lib/photos";
import Link from "next/link";
import type { Metadata } from "next";
import { CalendarCheck, Plus } from "@/components/ui/icons";
import { requirePermission } from "@/lib/auth/session";
import { can } from "@/lib/permissions";
import { PermissionDenied } from "@/components/app/permission-denied";
import {
  calendarEventsForUnit,
  monthGridRange,
  timelineWindow,
  type CalendarEvent,
} from "@/lib/calendar";
import {
  addDaysLocal,
  isLocalDate,
  isValidMonth,
  nightsBetween,
  shiftMonth,
  todayInTimeZone,
  utcToLocalDateTimeParts,
} from "@/lib/dates";
import { RESERVATION_STATUS_LABELS, UNIT_STATUS_LABELS } from "@/lib/labels";
import {
  getOccupancySegments,
  listCalendarActivity,
} from "@/server/inventory/availability";
import { listOrgUnits, listProperties } from "@/server/inventory/service";
import { listTasks } from "@/server/operations/service";
import { getReservationBalances } from "@/server/payments/service";
import { formatPHP } from "@/lib/money";
import { PageHeading } from "@/components/app/page-heading";
import { getDeviceClass } from "@/lib/device";
import {
  getMobileSearchProps,
  MobileTopBar,
} from "@/components/app/mobile-top-bar";
import { EndOfPage } from "@/components/app/end-of-page";
import { MobileFab } from "@/components/app/mobile-fab";
import { MobileMonth, type PhoneEvent } from "./mobile-month";
import { buttonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { MonthCalendar, type DisplayCalendarEvent } from "./month-calendar";
import { DayTimeline } from "./day-timeline";
import { TimelineCalendar } from "./timeline-calendar";
import { TodayPanel } from "./today-panel";
import { UnitFilter } from "./unit-filter";
import {
  isCalendarView,
  ViewSwitcher,
  type CalendarView,
} from "./view-switcher";

export const metadata: Metadata = { title: "Calendar" };
const MONTH_LABEL = new Intl.DateTimeFormat("en-PH", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const SHORT_DATE = new Intl.DateTimeFormat("en-PH", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});
const DAY_LABEL = new Intl.DateTimeFormat("en-PH", {
  weekday: "short",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});
function timeLabel(time: string) {
  const [hour, minute] = time.split(":");
  return `${Number(hour) % 12 || 12}:${minute} ${Number(hour) < 12 ? "AM" : "PM"}`;
}
/** "3PM", "10:30AM": fits on a slim calendar bar. */
function compactTimeLabel(time: string) {
  const [hour, minute] = time.split(":");
  return `${Number(hour) % 12 || 12}${minute === "00" ? "" : `:${minute}`}${Number(hour) < 12 ? "AM" : "PM"}`;
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{
    month?: string;
    unit?: string;
    view?: string;
    date?: string;
  }>;
}) {
  const membership = await requirePermission("reservations.view");
  if (!membership) return <PermissionDenied />;
  const params = await searchParams;
  const device = await getDeviceClass();
  const phone = device === "mobile";
  const [properties, allUnits] = await Promise.all([
    listProperties(membership.organizationId),
    listOrgUnits(membership.organizationId),
  ]);

  if (properties.length === 0) {
    // Nothing to book yet: show the empty calendar so the page already looks
    // like the tool, with the one useful action in the header.
    const timezone = "Asia/Manila";
    const today = todayInTimeZone(timezone);
    const month = isValidMonth(params.month ?? "")
      ? params.month!
      : today.slice(0, 7);
    const monthHref = (target: string) => `/calendar?month=${target}`;
    const canAddProperty = can(membership, "properties.create");
    return (
      <div className="mx-auto min-w-0 max-w-[1600px] overflow-hidden">
        <PageHeading title="Calendar">
          {canAddProperty ? (
            <Link href="/properties" className={buttonClassName("clay", "md")}>
              <Plus className="h-4 w-4" aria-hidden />
              Add property
            </Link>
          ) : null}
        </PageHeading>
        {!canAddProperty ? (
          <p className="mb-4 text-sm text-pine/70">
            Ask an owner or admin to add a property and its first unit.
          </p>
        ) : null}
        <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_19rem] 2xl:grid-cols-[minmax(0,1fr)_21rem]">
          <div className="min-w-0">
            <MonthCalendar
              month={month}
              today={today}
              timeZone={timezone}
              monthLabel={MONTH_LABEL.format(new Date(`${month}-01T00:00:00Z`))}
              events={[]}
              previousHref={monthHref(shiftMonth(month, -1))}
              nextHref={monthHref(shiftMonth(month, 1))}
              todayHref={monthHref(today.slice(0, 7))}
              newReservationHref={null}
              showUnit={false}
              viewSwitcher={null}
            />
          </div>
          <TodayPanel
            today={today}
            timezone={timezone}
            multipleTimezones={false}
            scopeLabel="All units"
            arrivals={[]}
            departures={[]}
            activeHolds={[]}
            openTasks={[]}
          />
        </div>
      </div>
    );
  }

  const selectedUnit = allUnits.find((unit) => unit.id === params.unit);
  const visibleUnits = selectedUnit ? [selectedUnit] : allUnits;
  const unitMap = new Map(allUnits.map((unit) => [unit.id, unit]));
  const propertyMap = new Map(
    properties.map((property) => [property.id, property]),
  );
  const propertyForUnit = (unitId: string) =>
    propertyMap.get(unitMap.get(unitId)!.propertyId)!;
  // Resolve the selected property's timezone BEFORE deriving today or the month.
  const timezone = selectedUnit
    ? propertyForUnit(selectedUnit.id).timezone
    : properties[0]!.timezone;
  const today = todayInTimeZone(timezone);
  const unitDays = visibleUnits.map((unit) => ({
    unitId: unit.id,
    today: todayInTimeZone(propertyForUnit(unit.id).timezone),
  }));
  const todayByUnit = new Map(
    unitDays.map((unit) => [unit.unitId, unit.today]),
  );
  const multipleTimezones =
    new Set(visibleUnits.map((unit) => propertyForUnit(unit.id).timezone))
      .size > 1;
  const view: CalendarView = isCalendarView(params.view)
    ? params.view
    : "month";
  // The day view shows one date; the month around it supplies the events.
  const selectedDate =
    params.date && isLocalDate(params.date) ? params.date : today;
  const month =
    view === "day"
      ? selectedDate.slice(0, 7)
      : isValidMonth(params.month ?? "")
        ? params.month!
        : today.slice(0, 7);
  // The timeline scrolls through several months, so it loads a wider window.
  const gridRange =
    view === "timeline" ? timelineWindow(month) : monthGridRange(month);
  const [segmentsByUnit, activity, taskRows] = await Promise.all([
    // Include the preceding night so time-bound turnovers on the first grid date are retained.
    getOccupancySegments(
      membership.organizationId,
      visibleUnits.map((unit) => unit.id),
      addDaysLocal(gridRange.start, -1),
      gridRange.end,
    ),
    listCalendarActivity(membership.organizationId, unitDays),
    listTasks(membership.organizationId, { status: "open" }),
  ]);
  // Late check-out hours move the expected departure (src/lib/extensions.ts).
  const extensionHours = await getExtensionHours(membership.organizationId, [
    ...[...segmentsByUnit.values()]
      .flat()
      .flatMap((segment) =>
        segment.kind === "reservation" ? [segment.id] : [],
      ),
    ...activity.map((reservation) => reservation.id),
  ]);
  // Money for the quick view, only for people who may see it.
  const showMoney = can(membership, "payments.view");
  const balances = showMoney
    ? await getReservationBalances(
        membership.organizationId,
        [...segmentsByUnit.values()]
          .flat()
          .flatMap((segment) =>
            segment.kind === "reservation" ? [segment.id] : [],
          ),
      )
    : new Map();
  const canStays = can(membership, "stays.update");
  const canConfirm = can(membership, "reservations.update");
  const canRecordPayment = can(membership, "payments.create");
  const canSeeGuests = can(membership, "guests.view");

  const unitLabel = (unitId: string) => {
    const unit = unitMap.get(unitId)!;
    return properties.length > 1
      ? `${propertyForUnit(unitId).name} · ${unit.name}`
      : unit.name;
  };
  const expiryLabel = (date: Date, unitId: string) =>
    new Intl.DateTimeFormat("en-PH", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: propertyForUnit(unitId).timezone,
    }).format(date);
  const visibleIds = new Set(visibleUnits.map((unit) => unit.id));
  const openTasks = taskRows.filter((task) => visibleIds.has(task.unitId));
  const arrivals = activity.filter(
    (reservation) =>
      reservation.status !== "hold" &&
      reservation.startDate === todayByUnit.get(reservation.unitId),
  );
  const departures = activity.filter(
    (reservation) =>
      reservation.status !== "hold" &&
      reservation.endDate === todayByUnit.get(reservation.unitId),
  );
  const activeHolds = activity.filter(
    (reservation) => reservation.status === "hold",
  );

  // Unit status controls bookability; it is not a calendar event. Real blocks,
  // stays, holds, manual blocks, and turnovers remain visible regardless of current status.
  const events: CalendarEvent[] = visibleUnits.flatMap((unit) =>
    calendarEventsForUnit(unit.id, segmentsByUnit.get(unit.id) ?? []),
  );
  // Turnovers render as a marker where the departing stay ends, not as bars.
  const turnoverByReservation = new Map(
    events
      .filter((event) => event.kind === "turnover" && event.reservationId)
      .map((event) => [event.reservationId!, event]),
  );
  const shortDate = (date: string) =>
    SHORT_DATE.format(new Date(`${date}T00:00:00Z`));
  const dayLabel = (date: string) =>
    DAY_LABEL.format(new Date(`${date}T00:00:00Z`));
  const displayEvents = events.flatMap((event): DisplayCalendarEvent[] => {
    if (event.kind === "turnover") return [];
    const unit = unitMap.get(event.unitId)!;
    const timezone = propertyForUnit(event.unitId).timezone;
    const reservationEvent = event.kind === "stay" || event.kind === "hold";
    const nights = nightsBetween(event.startDate, event.endDate);
    const nightLabel = `${nights} night${nights === 1 ? "" : "s"}`;
    const turnover = event.reservationId
      ? turnoverByReservation.get(event.reservationId)
      : undefined;
    const turnoverWindow =
      turnover?.startTime && turnover.endTime
        ? { startTime: turnover.startTime, endTime: turnover.endTime }
        : undefined;
    const href = event.reservationId
      ? `/reservations/${event.reservationId}`
      : can(membership, "properties.view")
        ? `/properties/${unit.propertyId}/units/${unit.id}`
        : undefined;
    const title =
      event.kind === "block" ? (event.description ?? event.title) : event.title;

    if (!reservationEvent) {
      const lastNight = addDaysLocal(event.endDate, -1);
      return [
        {
          ...event,
          unitLabel: unitLabel(event.unitId),
          detail: event.description ?? "Unit unavailable",
          href,
          accessibleLabel: `Blocked · ${title} · ${unitLabel(event.unitId)} · ${shortDate(event.startDate)} to ${shortDate(lastNight)}`,
          quickView: {
            kindLabel: "Blocked",
            tone: "block",
            title,
            unitLabel: unitLabel(event.unitId),
            facts: [
              { label: "From", value: dayLabel(event.startDate) },
              { label: "Through", value: dayLabel(lastNight) },
            ],
            href,
            hrefLabel: "View unit",
          },
        },
      ];
    }

    // The bar ends at the recorded departure when there is one, otherwise at
    // the unit's expected check-out time (plus any late check-out) on the checkout date.
    const actual = event.actualCheckoutAt
      ? utcToLocalDateTimeParts(event.actualCheckoutAt, timezone)
      : null;
    const lateHours = event.reservationId
      ? (extensionHours.get(event.reservationId) ?? 0)
      : 0;
    const expectedTime = extendedCheckoutTime(unit.checkOutTime, lateHours);
    const endDate = actual?.date ?? event.endDate;
    const endTime = actual?.time ?? expectedTime;
    const tone =
      event.kind === "hold"
        ? "hold"
        : event.status === "checked_in"
          ? "in-house"
          : event.status === "checked_out"
            ? "checked-out"
            : "confirmed";
    const kindLabel =
      event.kind === "hold" ? "Hold" : RESERVATION_STATUS_LABELS[event.status!];
    const detail =
      event.kind === "hold"
        ? `Hold · ${nightLabel}${event.expiresAt ? ` · expires ${expiryLabel(event.expiresAt, event.unitId)}` : ""}`
        : `${kindLabel} · ${nightLabel}`;
    const checkInLabel = `${shortDate(event.startDate)}, ${timeLabel(unit.checkInTime)}`;
    const checkOutLabel = `${shortDate(endDate)}, ${timeLabel(endTime)}${actual ? " (actual)" : lateHours ? ` (late check-out +${lateHours}h)` : ""}`;
    const facts = [
      { label: "Nights", value: String(nights) },
      ...(event.guestCount
        ? [{ label: "Guests", value: String(event.guestCount) }]
        : []),
      ...(event.kind === "hold" && event.expiresAt
        ? [
            {
              label: "Hold expires",
              value: expiryLabel(event.expiresAt, event.unitId),
            },
          ]
        : []),
    ];
    return [
      {
        ...event,
        endDate,
        timed: true,
        startTime: unit.checkInTime,
        endTime,
        turnover: turnoverWindow,
        timeLabel: `${compactTimeLabel(unit.checkInTime)} → ${compactTimeLabel(endTime)}`,
        unitLabel: unitLabel(event.unitId),
        detail,
        href,
        accessibleLabel: `${event.title} · ${unitLabel(event.unitId)} · ${detail}${event.platform ? ` · via ${event.platform.name}` : ""} · check-in ${checkInLabel} · check-out ${checkOutLabel}${turnover ? ` · ${turnover.description}` : ""}`,
        quickView: {
          kindLabel,
          tone,
          title: event.title,
          reference: event.reservationId
            ? `#${event.reservationId.slice(0, 8).toUpperCase()}`
            : undefined,
          platform: event.platform ?? undefined,
          platformReference: event.platformReference ?? undefined,
          unitLabel: unitLabel(event.unitId),
          propertyName: propertyForUnit(event.unitId).name,
          timing: stayTiming(
            event.status!,
            event.startDate,
            endDate,
            todayByUnit.get(event.unitId) ?? today,
          ),
          guest: {
            email: event.guestEmail ?? undefined,
            phone: event.guestPhone ?? undefined,
            href:
              canSeeGuests && event.guestId
                ? `/guests/${event.guestId}`
                : undefined,
          },
          money: (() => {
            const balance = event.reservationId
              ? balances.get(event.reservationId)
              : undefined;
            if (!balance) return undefined;
            const paid =
              balance.paidBookingCents - balance.refundedBookingCents;
            return {
              total: formatPHP(balance.bookingTotalCents),
              paid: formatPHP(paid),
              balance: formatPHP(Math.max(0, balance.bookingBalanceCents)),
              due: balance.bookingBalanceCents > 0,
              paidShare: balance.bookingTotalCents
                ? Math.min(1, Math.max(0, paid / balance.bookingTotalCents))
                : 1,
              depositHeld: balance.depositHeldCents
                ? formatPHP(balance.depositHeldCents)
                : undefined,
            };
          })(),
          actions: [
            ...(event.status === "hold" && canConfirm
              ? [{ label: "Confirm hold", href: `${href}/confirm` }]
              : []),
            ...(event.status === "confirmed" &&
            canStays &&
            event.startDate <= (todayByUnit.get(event.unitId) ?? today)
              ? [{ label: "Check in", href: `${href}/check-in` }]
              : []),
            ...(event.status === "checked_in" && canStays
              ? [{ label: "Check out", href: `${href}/check-out` }]
              : []),
            ...(canRecordPayment &&
            event.status !== "checked_out" &&
            (balances.get(event.reservationId ?? "")?.bookingBalanceCents ??
              0) > 0
              ? [{ label: "Record payment", href: `${href}/payments/new` }]
              : []),
          ],
          checkIn: {
            date: dayLabel(event.startDate),
            time: timeLabel(unit.checkInTime),
          },
          checkOut: {
            date: dayLabel(endDate),
            time: timeLabel(endTime),
            actual: Boolean(actual),
            late:
              !actual && lateHours
                ? `+${lateHours}h late check-out`
                : undefined,
            expected: actual
              ? `${shortDate(event.endDate)}, ${timeLabel(expectedTime)}`
              : lateHours
                ? `${shortDate(event.endDate)}, ${timeLabel(unit.checkOutTime)} before extending`
                : undefined,
          },
          facts,
          turnover: turnoverWindow
            ? `Turnover ${timeLabel(turnoverWindow.startTime)} – ${timeLabel(turnoverWindow.endTime)}`
            : undefined,
          href,
          hrefLabel: "View reservation",
        },
      },
    ];
  });

  // Month, date, unit, and view all live in the URL so a refresh keeps them.
  const calendarHref = ({
    month: targetMonth = month,
    unitId = selectedUnit?.id ?? null,
    view: targetView = view,
    date: targetDate,
  }: {
    month?: string;
    unitId?: string | null;
    view?: CalendarView;
    date?: string;
  } = {}) => {
    // Switching to the day view lands on today when it's in this month.
    const day =
      targetDate ??
      (view === "day"
        ? selectedDate
        : today.startsWith(targetMonth)
          ? today
          : `${targetMonth}-01`);
    return `/calendar?${new URLSearchParams({
      month: targetView === "day" ? day.slice(0, 7) : targetMonth,
      ...(unitId ? { unit: unitId } : {}),
      ...(targetView !== "month" ? { view: targetView } : {}),
      ...(targetView === "day" ? { date: day } : {}),
    })}`;
  };
  const viewSwitcher = (
    <ViewSwitcher
      view={view}
      hrefFor={(targetView) => calendarHref({ view: targetView })}
    />
  );
  const newReservationHref = (date: string) =>
    `/reservations/new?${new URLSearchParams({ checkIn: date, checkOut: addDaysLocal(date, 1), ...(selectedUnit?.status === "active" ? { unit: selectedUnit.id } : {}) })}`;
  const canBookVisibleUnit = visibleUnits.some(
    (unit) => unit.status === "active",
  );
  const monthLabel = MONTH_LABEL.format(new Date(`${month}-01T00:00:00Z`));
  const phoneEvents: PhoneEvent[] = displayEvents.flatMap((event) =>
    event.kind === "stay" ||
    event.kind === "hold" ||
    event.kind === "block" ||
    event.kind === "unavailable"
      ? [
          {
            id: event.id,
            kind: event.kind,
            status: event.status,
            title:
              event.kind === "block"
                ? (event.description ?? event.title)
                : event.title,
            unitLabel: event.unitLabel,
            startDate: event.startDate,
            endDate: event.endDate,
            href: event.href,
            timeLabel: event.timeLabel,
            platformName: event.platform?.name,
          },
        ]
      : [],
  );
  // Only display-safe fields cross into the presentation components.
  const activityDisplay = (reservation: (typeof activity)[number]) => ({
    ...reservation,
    unitLabel: unitLabel(reservation.unitId),
    timezone: propertyForUnit(reservation.unitId).timezone,
    checkInTime:
      unitMap.get(reservation.unitId)!.checkInTime ??
      propertyForUnit(reservation.unitId).checkInTime,
    checkOutTime: extendedCheckoutTime(
      unitMap.get(reservation.unitId)!.checkOutTime ??
        propertyForUnit(reservation.unitId).checkOutTime,
      extensionHours.get(reservation.id) ?? 0,
    ),
    lateHours: extensionHours.get(reservation.id) ?? 0,
    expiryLabel: reservation.expiresAt
      ? expiryLabel(reservation.expiresAt, reservation.unitId)
      : null,
  });

  return (
    <div className="mx-auto min-w-0 max-w-[1600px] overflow-hidden">
      {phone ? (
        <MobileTopBar title="Calendar" search={await getMobileSearchProps()} />
      ) : (
        <PageHeading title="Calendar">
          <div className="flex flex-wrap gap-2">
            <Link
              href="/calendar/availability"
              className={buttonClassName("ghost", "md")}
            >
              <CalendarCheck className="h-4 w-4" aria-hidden />
              Check availability
            </Link>
            <Link
              href={newReservationHref(today)}
              className={buttonClassName("clay", "md")}
            >
              <Plus className="h-4 w-4" aria-hidden />
              New reservation
            </Link>
          </div>
        </PageHeading>
      )}

      {allUnits.length > 1 ? (
        <UnitFilter
          compact={phone}
          selectedId={selectedUnit?.id ?? null}
          hrefFor={(unitId) => calendarHref({ unitId })}
          units={allUnits.map((unit) => {
            const property = propertyMap.get(unit.propertyId);
            return {
              id: unit.id,
              name: unit.name,
              propertyName: property?.name ?? null,
              imageUrl: unitOrPropertyPhotoSrc(unit, property),
              bedrooms: unit.bedrooms,
              statusLabel:
                unit.status === "active"
                  ? null
                  : UNIT_STATUS_LABELS[unit.status],
            };
          })}
        />
      ) : null}

      <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_19rem] 2xl:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="min-w-0">
          {visibleUnits.length && view === "day" ? (
            <DayTimeline
              date={selectedDate}
              today={today}
              timeZone={timezone}
              units={visibleUnits.map((unit) => ({
                id: unit.id,
                name: unit.name,
                propertyName:
                  properties.length > 1 ? propertyForUnit(unit.id).name : null,
                bookable: unit.status === "active",
              }))}
              events={displayEvents}
              previousHref={calendarHref({
                view: "day",
                date: addDaysLocal(selectedDate, -1),
              })}
              nextHref={calendarHref({
                view: "day",
                date: addDaysLocal(selectedDate, 1),
              })}
              todayHref={calendarHref({ view: "day", date: today })}
              viewSwitcher={viewSwitcher}
            />
          ) : visibleUnits.length && view === "timeline" ? (
            <TimelineCalendar
              month={month}
              today={today}
              timeZone={timezone}
              units={visibleUnits.map((unit) => ({
                id: unit.id,
                name: unit.name,
                propertyName:
                  properties.length > 1 ? propertyForUnit(unit.id).name : null,
                bookable: unit.status === "active",
              }))}
              events={displayEvents}
              rangeStart={gridRange.start}
              rangeEnd={gridRange.end}
              unitId={selectedUnit?.id ?? null}
              viewSwitcher={viewSwitcher}
            />
          ) : visibleUnits.length && phone ? (
            <MobileMonth
              month={month}
              monthLabel={monthLabel}
              today={today}
              events={phoneEvents}
              previousHref={calendarHref({ month: shiftMonth(month, -1) })}
              nextHref={calendarHref({ month: shiftMonth(month, 1) })}
              todayHref={calendarHref({ month: today.slice(0, 7) })}
              viewSwitcher={viewSwitcher}
              unitId={
                selectedUnit?.status === "active" ? selectedUnit.id : undefined
              }
              canBook={canBookVisibleUnit}
            />
          ) : visibleUnits.length ? (
            <MonthCalendar
              month={month}
              today={today}
              timeZone={timezone}
              monthLabel={monthLabel}
              events={displayEvents}
              previousHref={calendarHref({ month: shiftMonth(month, -1) })}
              nextHref={calendarHref({ month: shiftMonth(month, 1) })}
              todayHref={calendarHref({ month: today.slice(0, 7) })}
              newReservationHref={
                canBookVisibleUnit ? newReservationHref : null
              }
              reservationUnitId={
                selectedUnit?.status === "active" ? selectedUnit.id : undefined
              }
              showUnit={!selectedUnit && allUnits.length > 1}
              viewSwitcher={viewSwitcher}
            />
          ) : (
            <EmptyState
              art="calendar"
              title="No units to show"
              description="Add a unit to your property to see stays and availability here."
              action={
                can(membership, "properties.create") ? (
                  <Link
                    href="/properties"
                    className={buttonClassName("outline", "md")}
                  >
                    Manage properties
                  </Link>
                ) : undefined
              }
            />
          )}
        </div>

        {phone && view === "month" ? null : (
          <TodayPanel
            today={today}
            timezone={timezone}
            multipleTimezones={multipleTimezones}
            scopeLabel={selectedUnit ? unitLabel(selectedUnit.id) : "All units"}
            arrivals={arrivals.map(activityDisplay)}
            departures={departures.map(activityDisplay)}
            activeHolds={activeHolds.map(activityDisplay)}
            openTasks={openTasks.map((task) => ({
              ...task,
              unitLabel: unitLabel(task.unitId),
            }))}
          />
        )}
      </div>

      {phone ? <EndOfPage /> : null}

      {phone ? (
        <MobileFab
          actions={[
            {
              href: newReservationHref(today),
              label: "New reservation",
              icon: "plus",
            },
            {
              href: "/calendar/availability",
              label: "Check availability",
              icon: "availability",
            },
          ]}
        />
      ) : null}
    </div>
  );
}

/** "Arrives tomorrow", "Leaves in 3 days", "Left Sep 23"…, from the unit's today. */
function stayTiming(
  status: string,
  startDate: string,
  endDate: string,
  today: string,
): string {
  const days = (from: string, to: string) =>
    Math.round(
      (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
        86_400_000,
    );
  const inDays = (n: number) =>
    n === 0 ? "today" : n === 1 ? "tomorrow" : `in ${n} days`;
  const short = (date: string) =>
    new Intl.DateTimeFormat("en-PH", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }).format(new Date(`${date}T00:00:00Z`));
  if (status === "checked_out") return `Checked out ${short(endDate)}`;
  if (status === "checked_in")
    return `Staying now · leaves ${inDays(Math.max(0, days(today, endDate)))}`;
  const untilArrival = days(today, startDate);
  if (untilArrival < 0)
    return `Was due ${short(startDate)} · not checked in yet`;
  return `Arrives ${inDays(untilArrival)}`;
}
