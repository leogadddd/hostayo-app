import Link from "next/link";
import { Plus, MagnifyingGlass as Search, X } from "@/components/ui/icons";
import { RESERVATION_STATUSES } from "@/lib/db/schema";
import { RESERVATION_STATUS_LABELS } from "@/lib/labels";
import { nightsBetween } from "@/lib/dates";
import { formatPHP } from "@/lib/money";
import { cn } from "@/lib/utils";
import { PlatformBadge } from "@/components/app/platform-badge";
import { buttonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeading } from "@/components/app/page-heading";
import {
  RESERVATION_STATUS_STYLES,
  ReservationStatusBadge,
} from "@/components/app/reservation-status-badge";
import { TableActionsMenu } from "@/components/ui/table-actions-menu";
import { quickCancelReservationAction } from "./actions";
import { ReservationFilters } from "./reservation-filters";
import { CREATED_AT, HOLD_EXPIRY, dayLabel } from "./model";
import type { ReservationsModel } from "./model";

export function DesktopReservations({ model }: { model: ReservationsModel }) {
  const {
    params,
    status,
    startDate,
    endDate,
    sort,
    unitIds,
    platformIds,
    reservations,
    allCount,
    counts,
    units,
    platforms,
    showProperty,
    showTotals,
    canEdit,
    canCancel,
    thisYear,
    hrefWith,
    filtered,
  } = model;
  return (
    <div className="min-w-0 overflow-hidden">
      <PageHeading
        title="Reservations"
        description="Holds and bookings across your units."
      >
        <Link
          href="/reservations/new"
          className={buttonClassName("clay", "md")}
        >
          <Plus className="h-4 w-4" aria-hidden />
          New reservation
        </Link>
      </PageHeading>

      <nav
        aria-label="Filter by status"
        className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [mask-image:linear-gradient(to_right,#000_calc(100%-2.5rem),transparent)] pr-10 sm:pr-0 sm:[mask-image:none] sm:flex-wrap sm:overflow-visible sm:pb-0 [&::-webkit-scrollbar]:hidden"
      >
        <StatusPill
          href={hrefWith({ status: undefined })}
          active={!status}
          label="All"
          count={allCount}
        />
        {RESERVATION_STATUSES.map((value) => (
          <StatusPill
            key={value}
            href={hrefWith({ status: value })}
            active={status === value}
            label={RESERVATION_STATUS_LABELS[value]}
            count={counts.get(value) ?? 0}
            dot={RESERVATION_STATUS_STYLES[value].dot}
          />
        ))}
      </nav>

      {/* Search and filters share one row, even on phones; filters stay at the right end. */}
      <div className="mt-4 flex items-center gap-2 sm:gap-3">
        <form method="get" role="search" className="min-w-0 flex-1 sm:max-w-md">
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
          <label htmlFor="reservation-search" className="sr-only">
            Search guest
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-pine/45"
              aria-hidden
            />
            {/* Enter searches; the clear link keeps every other filter. */}
            <Input
              id="reservation-search"
              type="search"
              name="q"
              defaultValue={params.q ?? ""}
              placeholder="Search guest name, email or phone"
              className="pl-9 pr-9 [&::-webkit-search-cancel-button]:hidden"
            />
            {params.q ? (
              <Link
                href={hrefWith({ q: undefined })}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-ink/45 hover:bg-pine-mist hover:text-pine"
              >
                <X className="h-4 w-4" aria-hidden />
              </Link>
            ) : null}
          </div>
        </form>
        <ReservationFilters
          query={params.q}
          status={status}
          unitId={unitIds[0]}
          platformId={platformIds[0]}
          startDate={startDate}
          endDate={endDate}
          sort={sort}
          units={units}
          platforms={platforms}
        />
      </div>

      {reservations.length === 0 ? (
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
            <Link
              href="/reservations/new"
              className={buttonClassName("clay", "md")}
            >
              New reservation
            </Link>
          }
        />
      ) : (
        <div className="mt-4 overflow-hidden rounded-2xl border border-pine/10 bg-surface shadow-[0_1px_2px_rgba(32,58,53,0.06)]">
          <Table
            aria-label="Reservations"
            className="[&_td]:px-2.5 [&_th]:px-2.5 [&_td:first-child]:pl-4 [&_th:first-child]:pl-4"
          >
            <TableHeader>
              <TableRow>
                <TableHead>Ref</TableHead>
                <TableHead>Guest</TableHead>
                <TableHead>Status</TableHead>
                {showProperty ? <TableHead>Property</TableHead> : null}
                <TableHead>Unit</TableHead>
                <TableHead>Check-in</TableHead>
                <TableHead>Check-out</TableHead>
                <TableHead className="text-right">Nights</TableHead>
                <TableHead className="text-right">Guests</TableHead>
                <TableHead>Platform</TableHead>
                {showTotals ? (
                  <TableHead className="text-right">Total</TableHead>
                ) : null}
                <TableHead>Created at</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reservations.map((reservation) => {
                const href = `/reservations/${reservation.id}`;
                const active =
                  reservation.status === "hold" ||
                  reservation.status === "confirmed";
                return (
                  <TableRow
                    key={reservation.id}
                    className={cn(
                      (reservation.status === "cancelled" ||
                        reservation.status === "expired") &&
                        "text-ink/55",
                    )}
                  >
                    <TableCell className="whitespace-nowrap font-mono text-xs text-ink/55">
                      <Link href={href} className="hover:text-clay">
                        #{reservation.id.slice(0, 8).toUpperCase()}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-48 truncate">
                      <Link
                        href={href}
                        className="font-medium text-pine underline-offset-4 hover:underline"
                      >
                        {reservation.guestName}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <ReservationStatusBadge
                        status={reservation.status}
                        title={
                          reservation.status === "hold" && reservation.expiresAt
                            ? `Hold expires ${HOLD_EXPIRY.format(reservation.expiresAt)}`
                            : undefined
                        }
                      />
                    </TableCell>
                    {showProperty ? (
                      <TableCell className="max-w-36 truncate text-ink/70">
                        {reservation.propertyName ?? "—"}
                      </TableCell>
                    ) : null}
                    <TableCell className="max-w-36 truncate text-ink/80">
                      {reservation.unitName}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-ink/75">
                      {dayLabel(reservation.checkInDate, thisYear)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-ink/75">
                      {dayLabel(reservation.checkOutDate, thisYear)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-ink/75">
                      {nightsBetween(
                        reservation.checkInDate,
                        reservation.checkOutDate,
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-ink/75">
                      {reservation.guestCount}
                    </TableCell>
                    <TableCell
                      className="max-w-36 text-ink/75"
                      title={
                        reservation.platformReference
                          ? `Booking code ${reservation.platformReference}`
                          : undefined
                      }
                    >
                      <PlatformBadge
                        platform={
                          reservation.platformName
                            ? {
                                name: reservation.platformName,
                                logoUrl: reservation.platformLogoUrl,
                                color: reservation.platformColor,
                              }
                            : null
                        }
                      />
                    </TableCell>
                    {showTotals ? (
                      <TableCell className="whitespace-nowrap text-right font-medium tabular-nums text-pine">
                        {formatPHP(reservation.bookingTotalCents ?? 0)}
                      </TableCell>
                    ) : null}
                    <TableCell className="whitespace-nowrap text-ink/65">
                      {reservation.createdAt ? (
                        <time dateTime={reservation.createdAt.toISOString()}>
                          {CREATED_AT.format(reservation.createdAt)}
                        </time>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <TableActionsMenu
                        label={`reservation for ${reservation.guestName}`}
                        viewHref={href}
                        editHref={
                          canEdit && active ? `${href}/edit` : undefined
                        }
                        deleteLabel={`Cancel reservation for ${reservation.guestName}?`}
                        deleteDescription="This safely cancels the reservation and releases its dates. It keeps payment, task, and audit history; it does not permanently delete records."
                        destructiveActionLabel="Cancel"
                        deleteSuccessMessage="Reservation cancelled."
                        onDelete={
                          canCancel && active
                            ? quickCancelReservationAction.bind(
                                null,
                                reservation.id,
                              )
                            : undefined
                        }
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <p className="border-t border-pine/10 bg-linen/60 px-4 py-2.5 text-xs text-ink/55">
            {reservations.length}{" "}
            {reservations.length === 1 ? "reservation" : "reservations"}
            {status
              ? ` · ${RESERVATION_STATUS_LABELS[status].toLowerCase()}`
              : ""}
            {showTotals ? " · totals exclude refundable deposits" : ""}
          </p>
        </div>
      )}
    </div>
  );
}

function StatusPill({
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
        "inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
        active
          ? "border-primary bg-primary text-white"
          : "border-pine/15 bg-surface text-pine hover:border-pine/35",
      )}
    >
      {dot ? (
        <span aria-hidden className={cn("h-2 w-2 rounded-full", dot)} />
      ) : null}
      {label}
      <span
        className={cn(
          "rounded-full px-1.5 text-xs tabular-nums",
          active ? "bg-white/20 text-white" : "bg-pine/[0.07] text-ink/60",
        )}
      >
        {count}
      </span>
    </Link>
  );
}
