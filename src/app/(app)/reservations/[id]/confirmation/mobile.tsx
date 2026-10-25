import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDots as CalendarDays,
  CaretRight as ChevronRight,
  CheckCircle as CircleCheck,
  Clock,
  SignIn as LogIn,
  SignOut as LogOut,
  Envelope as Mail,
  Phone,
  Plus,
  Users,
  Wallet,
} from "@/components/ui/icons";
import { buttonClassName } from "@/components/ui/button";
import { MOBILE_CARD } from "@/components/app/mobile-ui";
import { CHARGE_TYPE_LABELS } from "@/lib/charges";
import { unitOrPropertyPhotoSrc } from "@/lib/photos";
import { formatPHP } from "@/lib/money";
import { cn } from "@/lib/utils";
import {
  dayLabel,
  plural,
  timeLabel,
  UnitPhoto,
} from "../../../calendar/availability/stay-display";
import type { ConfirmationData } from "./model";

function Card({
  title,
  children,
  className,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn(MOBILE_CARD, "p-4", className)}>
      {title ? (
        <h2 className="mb-3 font-display text-lg text-pine">{title}</h2>
      ) : null}
      {children}
    </section>
  );
}

function Fact({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof LogIn;
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl bg-linen p-3">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sage/60 text-pine">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <dt className="mt-2.5 text-xs text-ink/50">{label}</dt>
      <dd className="mt-0.5 text-[15px] font-semibold leading-snug text-pine">
        {value}
        {detail ? (
          <span className="block text-xs font-normal text-ink/55">
            {detail}
          </span>
        ) : null}
      </dd>
    </div>
  );
}

function NextRow({
  href,
  title,
  description,
  icon: Icon = ChevronRight,
}: {
  href: string;
  title: string;
  description: string;
  icon?: typeof ChevronRight;
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-center gap-3 px-1 py-3.5 active:bg-pine-mist/70"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold text-pine">
            {title}
          </span>
          <span className="mt-0.5 block text-xs leading-snug text-ink/60">
            {description}
          </span>
        </span>
        <Icon className="h-4 w-4 shrink-0 text-ink/35" aria-hidden />
      </Link>
    </li>
  );
}

/** The "saved" page on a phone: a clear result, the stay and money at a glance, and next steps. */
export function MobileConfirmation({ data }: { data: ConfirmationData }) {
  const {
    detail,
    balances,
    nights,
    isHold,
    expiresLabel,
    reservationHref,
    shortRef,
    canSeeMoney,
    canConfirmHold,
    canRecordPayment,
  } = data;
  const { reservation, guest, unit, property, charges } = detail;
  const occupants = detail.occupants ?? [];
  const balanceDue = balances
    ? Math.max(0, balances.bookingBalanceCents) +
      balances.depositOutstandingCents
    : 0;

  return (
    <div className="pb-4">
      {/* The result, big and clear, fading into the page */}
      <header
        className={cn(
          "relative -mx-4 -mt-5 px-6 pb-9 pt-12 text-center sm:-mx-6 sm:-mt-6",
          isHold
            ? "bg-gradient-to-b from-clay-mist to-paper"
            : "bg-gradient-to-b from-sage/80 to-paper",
        )}
      >
        <span
          className={cn(
            "mx-auto flex h-20 w-20 items-center justify-center rounded-full text-white shadow-[0_12px_28px_rgba(32,58,53,0.25)] ring-8",
            isHold ? "bg-clay ring-clay/15" : "bg-primary ring-primary/10",
          )}
        >
          {isHold ? (
            <Clock className="h-9 w-9" aria-hidden />
          ) : (
            <CircleCheck className="h-9 w-9" aria-hidden />
          )}
        </span>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-ink/50">
          Reservation {shortRef}
        </p>
        <h1 className="mt-1.5 font-display text-[2rem] leading-tight tracking-tight text-pine">
          {isHold
            ? "Hold placed"
            : reservation.status === "confirmed"
              ? "Booking confirmed"
              : "Reservation saved"}
        </h1>
        <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-ink/70">
          {guest.name} · {unit.name}
          <br />
          {dayLabel(reservation.checkInDate)} →{" "}
          {dayLabel(reservation.checkOutDate)}
        </p>
        {isHold && expiresLabel ? (
          <p className="mx-auto mt-4 inline-flex max-w-xs items-center gap-2 rounded-full bg-white/70 px-3.5 py-2 text-xs font-semibold text-clay-deep backdrop-blur">
            <Clock className="h-4 w-4 shrink-0" aria-hidden />
            Held until {expiresLabel}
          </p>
        ) : null}
      </header>

      <div className="space-y-3">
        <Card className="overflow-hidden p-0">
          <UnitPhoto
            src={unitOrPropertyPhotoSrc(unit, property)}
            className="aspect-[21/9] w-full"
          />
          <div className="p-4">
            {property ? (
              <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-clay-deep">
                {property.name}
              </p>
            ) : null}
            <h2 className="font-display text-xl text-pine">{unit.name}</h2>
            {property?.address ? (
              <p className="mt-0.5 text-xs text-ink/55">{property.address}</p>
            ) : null}
            <dl className="mt-4 grid grid-cols-2 gap-2.5">
              <Fact
                icon={LogIn}
                label="Check-in"
                value={dayLabel(reservation.checkInDate)}
                detail={`From ${timeLabel(unit.checkInTime)}`}
              />
              <Fact
                icon={LogOut}
                label="Check-out"
                value={dayLabel(reservation.checkOutDate)}
                detail={`By ${timeLabel(unit.checkOutTime)}`}
              />
              <Fact
                icon={CalendarDays}
                label="Length"
                value={plural(nights, "night")}
              />
              <Fact
                icon={Users}
                label="Guests"
                value={plural(reservation.guestCount, "guest")}
              />
            </dl>
          </div>
        </Card>

        {canSeeMoney && balances ? (
          <Card title="Payment">
            <ul className="divide-y divide-pine/8">
              {charges
                .filter((charge) => charge.type !== "security_deposit")
                .map((charge) => (
                  <li
                    key={charge.id}
                    className="flex items-start justify-between gap-3 py-2.5"
                  >
                    <span className="min-w-0">
                      <span className="block text-[15px] text-pine">
                        {charge.description}
                      </span>
                      {(() => {
                        // Name the type only when the description doesn't already say it.
                        const label = CHARGE_TYPE_LABELS[charge.type];
                        const parts = [
                          charge.description
                            .toLowerCase()
                            .includes(label.toLowerCase())
                            ? null
                            : label,
                          charge.quantity > 1
                            ? `${charge.quantity} × ${formatPHP(charge.unitAmountCents)}`
                            : null,
                        ].filter(Boolean);
                        return parts.length ? (
                          <span className="text-xs text-ink/50">
                            {parts.join(" · ")}
                          </span>
                        ) : null;
                      })()}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 text-[15px] font-semibold tabular-nums text-pine",
                        charge.type === "discount" && "text-clay-deep",
                      )}
                    >
                      {formatPHP(charge.amountCents)}
                    </span>
                  </li>
                ))}
            </ul>
            <div className="mt-1 border-t border-pine/12 pt-3.5">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-ink/60">Booking total</span>
                <span className="font-display text-xl tabular-nums text-pine">
                  {formatPHP(balances.bookingTotalCents)}
                </span>
              </div>
              {balances.depositTotalCents ? (
                <div className="mt-2 flex justify-between text-sm text-ink/65">
                  <span>Refundable deposit</span>
                  <span className="tabular-nums">
                    {formatPHP(balances.depositTotalCents)}
                  </span>
                </div>
              ) : null}
              <div className="mt-2 flex justify-between text-sm text-ink/65">
                <span>Paid so far</span>
                <span className="tabular-nums">
                  {formatPHP(
                    balances.paidBookingCents + balances.paidDepositCents,
                  )}
                </span>
              </div>
            </div>
            <div
              className={cn(
                "mt-3.5 flex items-center justify-between rounded-2xl px-4 py-3",
                balanceDue > 0
                  ? "bg-clay-mist text-clay-deep"
                  : "bg-sage/50 text-pine",
              )}
            >
              <span className="text-sm font-semibold">
                {balanceDue > 0 ? "Balance due" : "Paid in full"}
              </span>
              {balanceDue > 0 ? (
                <span className="text-lg font-semibold tabular-nums">
                  {formatPHP(balanceDue)}
                </span>
              ) : (
                <CircleCheck className="h-5 w-5" aria-hidden />
              )}
            </div>
          </Card>
        ) : null}

        <Card title="Guests">
          <p className="text-[15px] font-semibold text-pine">{guest.name}</p>
          <ul className="mt-2 space-y-1.5 text-sm text-ink/65">
            {guest.email ? (
              <li>
                <a
                  href={`mailto:${guest.email}`}
                  className="flex items-center gap-2"
                >
                  <Mail className="h-4 w-4 shrink-0 text-moss" aria-hidden />
                  <span className="truncate">{guest.email}</span>
                </a>
              </li>
            ) : null}
            {guest.phone ? (
              <li>
                <a
                  href={`tel:${guest.phone}`}
                  className="flex items-center gap-2"
                >
                  <Phone className="h-4 w-4 shrink-0 text-moss" aria-hidden />
                  {guest.phone}
                </a>
              </li>
            ) : null}
          </ul>
          <div className="mt-3.5 rounded-2xl bg-linen p-3.5">
            <p className="text-xs text-ink/50">Also staying</p>
            {occupants.length ? (
              <ul className="mt-1 space-y-0.5 text-[15px] font-medium text-pine">
                {occupants.map((occupant) => (
                  <li key={occupant.id}>{occupant.name}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-0.5 text-sm text-ink/60">No one else</p>
            )}
          </div>
        </Card>

        <Card title="What’s next" className="pb-2">
          <ul className="-mt-1 divide-y divide-pine/8">
            <NextRow
              href={reservationHref}
              title="Send the welcome link"
              description="Share check-in details and let the guest upload payment proof."
            />
            <NextRow
              href={`/calendar?${new URLSearchParams({ unit: unit.id, month: reservation.checkInDate.slice(0, 7) })}`}
              title="See it on the calendar"
              description="Check the turnover and neighbouring stays."
            />
            <NextRow
              href="/calendar/availability"
              title="Check availability"
              description="Search open dates for another guest."
            />
            <NextRow
              href="/reservations/new"
              title="New reservation"
              description="Start another booking from scratch."
              icon={Plus}
            />
          </ul>
        </Card>
      </div>

      {/* Pinned flush above the tab bar */}
      <div className="sticky -bottom-5 z-10 -mx-4 -mb-5 mt-4 border-t border-pine/10 bg-paper/95 px-4 pb-3 pt-3 shadow-[0_-8px_24px_rgba(32,58,53,0.08)] backdrop-blur sm:-bottom-6 sm:-mx-6 sm:-mb-6 sm:px-6">
        <div className="grid gap-2.5">
          {canConfirmHold ? (
            <Link
              href={`${reservationHref}/confirm`}
              className={buttonClassName(
                "outline",
                "lg",
                "h-12 whitespace-nowrap rounded-2xl px-3 text-sm",
              )}
            >
              Confirm hold
            </Link>
          ) : null}
          {canRecordPayment ? (
            <Link
              href={`${reservationHref}/payments/new`}
              className={buttonClassName(
                "outline",
                "lg",
                "h-12 whitespace-nowrap rounded-2xl px-3 text-sm",
              )}
            >
              <Wallet className="h-4 w-4" aria-hidden />
              Record payment
            </Link>
          ) : null}
          <Link
            href={reservationHref}
            className={buttonClassName(
              "clay",
              "lg",
              "h-12 rounded-2xl text-base",
            )}
          >
            Open reservation
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </div>
  );
}
