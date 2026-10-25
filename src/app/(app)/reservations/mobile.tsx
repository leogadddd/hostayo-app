import Link from "next/link";
import {
  CalendarBlank,
  CheckCircle,
  Clock,
  DoorOpen,
  Moon,
  Plus,
  MagnifyingGlass as Search,
  Users,
  X,
} from "@/components/ui/icons";
import { PlatformLogo } from "@/components/app/platform-badge";
import {
  RESERVATION_STATUS_STYLES,
  ReservationStatusBadge,
} from "@/components/app/reservation-status-badge";
import { OfflineChanges } from "@/components/app/offline-changes";
import { DataList } from "@/components/app/data-list";
import { EndOfPage } from "@/components/app/end-of-page";
import { MobileFab } from "@/components/app/mobile-fab";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClassName } from "@/components/ui/button";
import { RESERVATION_STATUSES } from "@/lib/db/schema";
import { RESERVATION_STATUS_LABELS } from "@/lib/labels";
import { formatPHP } from "@/lib/money";
import { cn } from "@/lib/utils";
import { quickCancelReservationAction } from "./actions";
import { MobileFilters } from "./mobile-filters";
import type { ReservationRow, ReservationsModel } from "./model";
import { ReservationRowActions } from "./row-actions";

const SHORT_DAY = new Intl.DateTimeFormat("en-PH", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});
const SHORT_DAY_YEAR = new Intl.DateTimeFormat("en-PH", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});
/** "Nov 9", or "Nov 9, 2027" outside this year; the card's tile already shows the weekday. */
function shortDay(date: string, thisYear: string) {
  const value = new Date(`${date}T00:00:00Z`);
  return (date.startsWith(thisYear) ? SHORT_DAY : SHORT_DAY_YEAR).format(value);
}
function Chip({
  href,
  active,
  label,
  count,
  dot,
}: {
  href: string;
  active: boolean;
  label: string;
  count: number;
  dot?: string;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-semibold shadow-[0_1px_4px_rgba(32,58,53,0.08)] ring-1 transition-colors",
        active
          ? "bg-primary text-white ring-primary"
          : "bg-surface text-pine ring-pine/8 active:bg-pine-mist",
      )}
    >
      {dot ? (
        <span aria-hidden className={cn("h-2 w-2 rounded-full", dot)} />
      ) : null}
      {label}
      <span
        className={cn(
          "rounded-full px-1.5 text-xs tabular-nums",
          active ? "bg-white/20" : "bg-pine/[0.07] text-ink/60",
        )}
      >
        {count}
      </span>
    </Link>
  );
}

/** One reservation: status on top, then who, and the few facts that matter as icons. */
function ReservationCard({
  row,
  showProperty,
  thisYear,
}: {
  row: ReservationRow;
  showProperty: boolean;
  thisYear: string;
}) {
  const closed = row.status === "cancelled" || row.status === "expired";
  return (
    <>
      <Link
        href={row.href}
        className={cn(
          "block px-4 pb-4 pt-4 active:bg-pine-mist/70",
          closed && "opacity-60",
        )}
      >
        <span className="flex min-h-11 items-center gap-2.5 pr-14">
          <ReservationStatusBadge status={row.status} />
          {row.platform ? (
            <span title={row.platform.name} className="inline-flex">
              <PlatformLogo
                platform={row.platform}
                className="h-6 w-6 rounded-md"
              />
              <span className="sr-only">
                Booked through {row.platform.name}
              </span>
            </span>
          ) : null}
        </span>
        <span className="mt-1.5 block truncate text-[17px] font-semibold text-pine">
          {row.guestName}
        </span>
        <span className="mt-2.5 flex items-center gap-2 text-sm text-ink/70">
          <DoorOpen className="h-4 w-4 shrink-0 text-moss" aria-hidden />
          <span className="truncate">
            {showProperty && row.propertyName ? `${row.propertyName} · ` : ""}
            {row.unitName}
          </span>
        </span>
        <span className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-ink/70">
          <span className="inline-flex items-center gap-1.5">
            <CalendarBlank className="h-4 w-4 text-moss" aria-hidden />
            {shortDay(row.checkInDate, thisYear)} →{" "}
            {shortDay(row.checkOutDate, thisYear)}
          </span>
          <span
            className="inline-flex items-center gap-1.5"
            title={row.nights === 1 ? "1 night" : `${row.nights} nights`}
          >
            <Moon className="h-4 w-4 text-moss" aria-hidden />
            {row.nights}
            <span className="sr-only">
              {row.nights === 1 ? "night" : "nights"}
            </span>
          </span>
          <span
            className="inline-flex items-center gap-1.5"
            title={
              row.guestCount === 1 ? "1 guest" : `${row.guestCount} guests`
            }
          >
            <Users className="h-4 w-4 text-moss" aria-hidden />
            {row.guestCount}
            <span className="sr-only">
              {row.guestCount === 1 ? "guest" : "guests"}
            </span>
          </span>
        </span>
        {row.holdExpiresLabel ? (
          <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800">
            <Clock className="h-4 w-4" aria-hidden />
            Expires {row.holdExpiresLabel}
          </span>
        ) : null}
        {row.totalCents !== null ? (
          <span className="mt-3.5 flex items-end justify-between gap-3 border-t border-pine/10 pt-3">
            <span>
              <span className="block text-xs font-medium text-ink/55">
                Total
              </span>
              <span className="block font-display text-[1.3rem] leading-tight tabular-nums text-pine">
                {formatPHP(row.totalCents)}
              </span>
            </span>
            {closed ? null : row.balanceCents !== null &&
              row.balanceCents > 0 ? (
              <span className="text-right">
                <span className="block text-xs font-medium text-ink/55">
                  Remaining
                </span>
                <span className="block text-[1.05rem] font-semibold tabular-nums text-clay-deep">
                  {formatPHP(row.balanceCents)}
                </span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-sage/50 px-3 py-1.5 text-sm font-semibold text-pine">
                <CheckCircle className="h-4 w-4" aria-hidden />
                {row.balanceCents !== null && row.balanceCents < 0
                  ? "Overpaid"
                  : "Paid in full"}
              </span>
            )}
          </span>
        ) : null}
      </Link>
      <div className="absolute right-2.5 top-3">
        <ReservationRowActions
          guestName={row.guestName}
          viewHref={row.href}
          editHref={row.editHref}
          onCancel={
            row.canCancel
              ? quickCancelReservationAction.bind(null, row.id)
              : undefined
          }
        />
      </div>
    </>
  );
}

/** The phone reservations list: search, status chips and one card per stay. */
export function MobileReservations({ model }: { model: ReservationsModel }) {
  const {
    params,
    status,
    startDate,
    endDate,
    sort,
    unitIds,
    platformIds,
    rows,
    allCount,
    counts,
    units,
    platforms,
    showProperty,
    showTotals,
    thisYear,
    canCreate,
    hrefWith,
    filtered,
  } = model;

  return (
    <div className="pb-28">
      <header className="mb-5 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-ink/55">
            {allCount === 1 ? "1 reservation" : `${allCount} reservations`}
          </p>
          <h1 className="font-display text-[2rem] leading-tight tracking-tight text-pine">
            Reservations
          </h1>
        </div>
        <MobileFilters
          query={params.q}
          status={status}
          unitIds={unitIds}
          platformIds={platformIds}
          startDate={startDate}
          endDate={endDate}
          sort={sort}
          units={units}
          platforms={platforms}
        />
      </header>

      <OfflineChanges />

      <form method="get" role="search">
        {status ? <input type="hidden" name="status" value={status} /> : null}
        {unitIds.map((id) => (
          <input key={id} type="hidden" name="unit" value={id} />
        ))}
        {platformIds.map((id) => (
          <input key={id} type="hidden" name="platform" value={id} />
        ))}
        {startDate ? (
          <input type="hidden" name="start" value={startDate} />
        ) : null}
        {endDate ? <input type="hidden" name="end" value={endDate} /> : null}
        {sort === "booked" ? (
          <input type="hidden" name="sort" value="booked" />
        ) : null}
        <label htmlFor="m-reservation-search" className="sr-only">
          Search guest
        </label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-pine/60"
            aria-hidden
          />
          <input
            id="m-reservation-search"
            type="search"
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Search guest, email or phone"
            enterKeyHint="search"
            className="h-12 w-full rounded-2xl bg-surface pl-12 pr-11 text-base text-ink shadow-[0_4px_20px_rgba(32,58,53,0.08)] ring-1 ring-pine/8 placeholder:text-ink/40 focus:outline-none focus:ring-2 focus:ring-pine/25 [&::-webkit-search-cancel-button]:hidden"
          />
          {params.q ? (
            <Link
              href={hrefWith({ q: undefined })}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-ink/10 text-ink/60"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </Link>
          ) : null}
        </div>
      </form>

      <nav
        aria-label="Filter by status"
        className="-mx-4 mt-4 flex scroll-pl-4 gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:-mx-6 sm:px-6 [&::-webkit-scrollbar]:hidden"
      >
        <Chip
          href={hrefWith({ status: undefined })}
          active={!status}
          label="All"
          count={allCount}
        />
        {RESERVATION_STATUSES.map((value) => (
          <Chip
            key={value}
            href={hrefWith({ status: value })}
            active={status === value}
            label={RESERVATION_STATUS_LABELS[value]}
            count={counts.get(value) ?? 0}
            dot={RESERVATION_STATUS_STYLES[value].dot}
          />
        ))}
      </nav>

      {rows.length === 0 ? (
        <EmptyState
          className="mt-8"
          art="reservations"
          title="No reservations found"
          description={
            filtered
              ? "Nothing matches these filters. Try widening the search."
              : "Create a hold or confirmed booking to get started."
          }
          action={
            canCreate ? (
              <Link
                href="/reservations/new"
                className={buttonClassName("clay", "md")}
              >
                <Plus className="h-4 w-4" aria-hidden />
                New reservation
              </Link>
            ) : undefined
          }
        />
      ) : (
        <>
          <p className="mb-3 mt-3 px-1 text-xs text-ink/55">
            {rows.length === 1
              ? "1 reservation"
              : `${rows.length} reservations`}
            {status
              ? ` · ${RESERVATION_STATUS_LABELS[status].toLowerCase()}`
              : ""}
            {showTotals ? " · totals exclude refundable deposits" : ""}
          </p>
          <DataList
            label="Reservations"
            items={rows}
            getKey={(row) => row.id}
            groupBy={(row) => ({ key: row.groupKey, label: row.groupLabel })}
            renderItem={(row) => (
              <ReservationCard
                row={row}
                showProperty={showProperty}
                thisYear={thisYear}
              />
            )}
          />
          <EndOfPage />
        </>
      )}

      {canCreate ? (
        <MobileFab
          actions={[
            {
              href: "/reservations/new",
              label: "New reservation",
              icon: "plus",
            },
          ]}
        />
      ) : null}
    </div>
  );
}
