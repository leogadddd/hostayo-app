import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Bath,
  BedDouble,
  CreditCard,
  LogIn,
  LogOut,
  Compass,
  KeyRound,
  MapPin,
  ScrollText,
  Sparkles,
  Users,
  Wifi,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonClassName } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { amenityIcon } from "@/app/(app)/properties/amenity-icons";
import { clockLabel, LONG_DATE } from "@/components/public/format";
import { ChannelList } from "@/components/public/contact-channel-list";
import { PublicShell } from "@/components/public/public-shell";
import { formatPHP } from "@/lib/money";
import { getGuestStay } from "@/lib/public-demo";
import {
  getGuestViewByToken,
  type GuestView,
} from "@/server/reservations/guest-link";
import {
  QuickLinks,
  StayActions,
  WifiCard,
  type QuickLinkKey,
} from "./stay/stay-actions";

export const metadata: Metadata = {
  title: "Your stay",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export const dynamic = "force-dynamic";

const STATUS: Record<
  string,
  { label: string; tone: "sage" | "clay" | "neutral" }
> = {
  hold: { label: "Awaiting confirmation", tone: "clay" },
  confirmed: { label: "Booked", tone: "sage" },
  checked_in: { label: "Checked in", tone: "sage" },
  checked_out: { label: "Checked out", tone: "neutral" },
  cancelled: { label: "Cancelled", tone: "neutral" },
  expired: { label: "Expired", tone: "neutral" },
};
const DEFAULT_STATUS = { label: "Booked", tone: "sage" } as const;
const PROOF_SUBMISSION_STATUSES = new Set(["hold", "confirmed", "checked_in"]);

function SectionCard({
  id,
  icon: Icon,
  title,
  children,
}: {
  id?: string;
  icon: typeof Wifi;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card id={id} className="scroll-mt-4">
      <CardBody>
        <h2 className="flex items-center gap-2.5 font-display text-xl text-pine">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-pine-mist text-pine">
            <Icon className="h-[18px] w-[18px]" aria-hidden />
          </span>
          {title}
        </h2>
        <div className="mt-4">{children}</div>
      </CardBody>
    </Card>
  );
}

function DirectionsCard({ address }: { address: string }) {
  const destination = encodeURIComponent(address);
  const links = [
    {
      label: "Google Maps",
      logo: "/maps/google-maps.svg",
      href: `https://www.google.com/maps/dir/?api=1&destination=${destination}`,
    },
    {
      label: "Apple Maps",
      logo: "/maps/apple-maps.png",
      href: `https://maps.apple.com/?daddr=${destination}`,
    },
    {
      label: "Waze",
      logo: "/maps/waze.svg",
      href: `https://waze.com/ul?q=${destination}&navigate=yes`,
    },
  ];
  return (
    <SectionCard id="directions" icon={MapPin} title="Getting there">
      <p className="text-sm leading-relaxed text-ink/60">{address}</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {links.map(({ label, logo, href }) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-pine/15 bg-surface px-3 py-3 text-sm font-medium text-pine transition hover:border-pine/35 hover:bg-pine-mist/50"
          >
            <Image
              src={logo}
              alt=""
              width={24}
              height={24}
              unoptimized
              className="h-6 w-6 shrink-0"
            />
            {label}
          </a>
        ))}
      </div>
    </SectionCard>
  );
}

function BookingPaymentCard({
  token,
  view,
}: {
  token: string;
  view: GuestView;
}) {
  const amountDue = view.bookingBalanceCents > 0;
  return (
    <Card id="booking" className="scroll-mt-4">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 marker:content-none">
          <span className="flex items-center gap-2.5 font-display text-xl text-pine">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-pine-mist text-pine">
              <CreditCard className="h-[18px] w-[18px]" aria-hidden />
            </span>
            <span className="flex min-w-0 flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-3">
              Booking and payment
              {amountDue ? (
                <Badge tone="clay" className="whitespace-nowrap font-sans">
                  Due {formatPHP(view.bookingBalanceCents)}
                </Badge>
              ) : null}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            <span
              className="text-sm text-ink/50 transition group-open:rotate-180"
              aria-hidden
            >
              ⌄
            </span>
          </span>
        </summary>
        <CardBody className="border-t border-pine/10 pt-5">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-ink/60">Booking total</dt>
              <dd className="font-medium text-pine">
                {formatPHP(view.bookingTotalCents)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink/60">Paid towards booking</dt>
              <dd className="font-medium text-pine">
                {formatPHP(view.paidBookingCents)}
              </dd>
            </div>
            {view.refundedBookingCents > 0 ? (
              <div className="flex justify-between gap-4">
                <dt className="text-ink/60">Refunded</dt>
                <dd className="font-medium text-clay-deep">
                  -{formatPHP(view.refundedBookingCents)}
                </dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-4 border-t border-pine/10 pt-3">
              <dt className="font-medium text-ink">
                {view.bookingBalanceCents >= 0 ? "Balance due" : "Overpaid by"}
              </dt>
              <dd
                className={
                  view.bookingBalanceCents >= 0
                    ? "font-semibold text-pine"
                    : "font-semibold text-clay-deep"
                }
              >
                {formatPHP(Math.abs(view.bookingBalanceCents))}
              </dd>
            </div>
          </dl>
          {view.depositTotalCents > 0 || view.depositPaidCents > 0 ? (
            <dl className="mt-4 space-y-2 border-t border-pine/10 pt-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-ink/60">Refundable security deposit</dt>
                <dd className="font-medium text-pine">
                  {formatPHP(view.depositTotalCents)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink/60">Deposit collected</dt>
                <dd className="font-medium text-pine">
                  {formatPHP(view.depositPaidCents)}
                </dd>
              </div>
              {view.depositHeldCents !== view.depositPaidCents ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-ink/60">Deposit still held</dt>
                  <dd className="font-medium text-pine">
                    {formatPHP(view.depositHeldCents)}
                  </dd>
                </div>
              ) : null}
            </dl>
          ) : null}
          {view.paymentInstructions ? (
            <div className="mt-5 border-t border-pine/10 pt-4">
              <h3 className="font-medium text-pine">How to pay</h3>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink/70">
                {view.paymentInstructions}
              </p>
            </div>
          ) : null}
          {PROOF_SUBMISSION_STATUSES.has(view.status) ? (
            <div className="mt-5 rounded-lg bg-sage/35 p-4">
              <h3 className="font-medium text-pine">Sent a payment?</h3>
              <p className="mt-1 text-sm leading-relaxed text-ink/60">
                Share the reference number or sender name so your host can match
                it to the booking.
              </p>
              {view.pendingProofs > 0 ? (
                <p className="mt-2 text-xs text-ink/50">
                  Your{" "}
                  {view.pendingProofs === 1 ? "reference is" : "references are"}{" "}
                  waiting for review.
                </p>
              ) : null}
              <Link
                href={`/g/${encodeURIComponent(token)}/payment-proof/new`}
                prefetch={false}
                className={buttonClassName(
                  "clay",
                  "lg",
                  "mt-4 w-full sm:w-auto",
                )}
              >
                Submit payment reference{" "}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          ) : null}
        </CardBody>
      </details>
    </Card>
  );
}

export default async function GuestPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const [stay, view] = await Promise.all([
    getGuestStay(token),
    getGuestViewByToken(token),
  ]);
  if (!stay || !view)
    return (
      <PublicShell>
        <div className="mx-auto max-w-lg px-4 py-16">
          <Card>
            <CardBody className="py-10 text-center">
              <h1 className="font-display text-2xl text-pine">
                This link is not valid
              </h1>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink/60">
                The link may have expired, been replaced by a newer one, or the
                address may be incomplete. Please contact your host for an
                updated link.
              </p>
            </CardBody>
          </Card>
        </div>
      </PublicShell>
    );

  const { unit, host } = stay;
  const status = STATUS[view.status] ?? DEFAULT_STATUS;
  const firstName = stay.guestName.split(" ")[0];
  const phone =
    host.channels.find((channel) => channel.kind === "phone" && channel.enabled)
      ?.value ?? null;
  const quickLinks: { key: QuickLinkKey; href: string; label: string }[] = [
    { key: "directions", href: "#directions", label: "Directions" },
    {
      key: "booking",
      href: "#booking",
      label: view.bookingBalanceCents > 0 ? "Pay balance" : "Booking",
    },
    ...(unit.wifiName
      ? [{ key: "wifi" as const, href: "#wifi", label: "Wi-Fi" }]
      : []),
    ...(unit.arrivalNotes.length
      ? [{ key: "arrival" as const, href: "#arrival", label: "Getting in" }]
      : []),
    ...(unit.guestHouseRules.length
      ? [{ key: "rules" as const, href: "#rules", label: "House rules" }]
      : []),
    ...(unit.areaTips.length
      ? [{ key: "area" as const, href: "#area", label: "Nearby" }]
      : []),
    ...(phone
      ? [
          {
            key: "phone" as const,
            href: `tel:${phone.replace(/\s/g, "")}`,
            label: "Call host",
          },
        ]
      : []),
  ];
  return (
    <PublicShell label="Your stay">
      <section className="relative isolate overflow-hidden border-b border-pine/10 bg-pine text-paper">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_80%_0%,#3a5851_0%,#203a35_55%,#162925_100%)]"
        />
        <div className="mx-auto max-w-2xl px-4 pb-10 pt-10 sm:px-6">
          <Badge tone={status.tone} className="mb-4">
            {status.label}
          </Badge>
          <h1 className="font-display text-4xl leading-tight sm:text-5xl">
            Welcome, {firstName}.
          </h1>
          <p className="mt-3 text-lg text-paper/75">
            Everything you need for your stay at{" "}
            <span className="text-paper">{unit.name}</span> is here.
          </p>
          <dl className="mt-8 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-paper/15 bg-paper/5 p-4">
              <dt className="flex items-center gap-2 text-xs text-sage">
                <LogIn className="h-4 w-4" aria-hidden />
                Check-in
              </dt>
              <dd className="mt-1 font-medium">
                {LONG_DATE.format(new Date(`${stay.checkInDate}T00:00:00Z`))}
              </dd>
              <dd className="text-sm text-paper/65">
                from {clockLabel(unit.checkInTime)}
              </dd>
            </div>
            <div className="rounded-xl border border-paper/15 bg-paper/5 p-4">
              <dt className="flex items-center gap-2 text-xs text-sage">
                <LogOut className="h-4 w-4" aria-hidden />
                Check-out
              </dt>
              <dd className="mt-1 font-medium">
                {LONG_DATE.format(new Date(`${stay.checkOutDate}T00:00:00Z`))}
              </dd>
              <dd className="text-sm text-paper/65">
                by {clockLabel(unit.checkOutTime)}
              </dd>
            </div>
          </dl>
        </div>
      </section>
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-8 sm:px-6">
        <QuickLinks items={quickLinks} />
        <DirectionsCard address={stay.address} />
        <BookingPaymentCard token={token} view={view} />
        {unit.wifiName ? (
          <SectionCard id="wifi" icon={Wifi} title="Wi-Fi">
            <WifiCard name={unit.wifiName} password={unit.wifiPassword} />
          </SectionCard>
        ) : null}
        <SectionCard icon={Sparkles} title={`About ${unit.name}`}>
          <p className="text-sm leading-relaxed text-ink/75">
            {unit.description}
          </p>
          <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink/70">
            <li className="flex items-center gap-2">
              <Users className="h-4 w-4 text-pine/70" aria-hidden />
              Sleeps {unit.capacity}
            </li>
            <li className="flex items-center gap-2">
              <BedDouble className="h-4 w-4 text-pine/70" aria-hidden />
              {unit.bedrooms} bedrooms
            </li>
            <li className="flex items-center gap-2">
              <Bath className="h-4 w-4 text-pine/70" aria-hidden />
              {unit.bathrooms} bathrooms
            </li>
          </ul>
        </SectionCard>
        <SectionCard icon={Sparkles} title="What’s included">
          <ul className="flex flex-wrap gap-2">
            {[...unit.unitAmenities, ...unit.propertyAmenities].map(
              (amenity) => {
                const Icon = amenityIcon(amenity.icon);
                return (
                  <li
                    key={amenity.name}
                    className="inline-flex items-center gap-1.5 rounded-full bg-pine-mist px-3 py-1.5 text-sm text-pine"
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                    {amenity.name}
                  </li>
                );
              },
            )}
          </ul>
        </SectionCard>
        <SectionCard id="rules" icon={ScrollText} title="House rules">
          <ul className="space-y-2.5">
            {unit.guestHouseRules.map((rule) => (
              <li
                key={rule}
                className="flex gap-3 text-sm leading-relaxed text-ink/80"
              >
                <span
                  aria-hidden
                  className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-clay"
                />
                {rule}
              </li>
            ))}
          </ul>
        </SectionCard>
        <SectionCard id="arrival" icon={KeyRound} title="Getting in">
          <ol className="space-y-3">
            {unit.arrivalNotes.map((note, index) => (
              <li
                key={note}
                className="flex gap-3 text-sm leading-relaxed text-ink/80"
              >
                <span
                  aria-hidden
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sage text-xs font-semibold text-pine"
                >
                  {index + 1}
                </span>
                {note}
              </li>
            ))}
          </ol>
        </SectionCard>
        {unit.areaTips.length ? (
          <SectionCard id="area" icon={Compass} title="Around the area">
            <ul className="divide-y divide-pine/10">
              {unit.areaTips.map((tip) => (
                <li key={tip.title} className="py-3 first:pt-0 last:pb-0">
                  <p className="text-sm font-medium text-pine">{tip.title}</p>
                  <p className="mt-0.5 text-sm text-ink/65">{tip.detail}</p>
                </li>
              ))}
            </ul>
          </SectionCard>
        ) : null}
        <StayActions
          token={token}
          unitName={unit.name}
          checkoutTime={clockLabel(unit.checkOutTime)}
          initiallyCheckedOut={view.status === "checked_out"}
        />
        <Card className="bg-sage/35">
          <CardBody>
            <h2 className="font-display text-xl text-pine">Your host</h2>
            <p className="mt-1 text-sm text-ink/65">
              {host.displayName} is a message away if you need anything.
            </p>
            <ChannelList channels={host.channels} className="mt-4" compact />
          </CardBody>
        </Card>
        <p className="text-center text-xs text-ink/40">
          This page updates as your booking changes.
        </p>
      </div>
    </PublicShell>
  );
}
