import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Bath,
  BedDouble,
  ChevronLeft,
  Clock,
  LogIn,
  LogOut,
  MapPin,
  ScrollText,
  Users,
} from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { buttonClassName } from "@/components/ui/button";
import { amenityIcon } from "@/app/(app)/properties/amenity-icons";
import { UnitAvailability } from "@/components/public/unit-availability";
import { ChannelList } from "@/components/public/contact-channel-list";
import { clockLabel } from "@/components/public/format";
import {
  PhotoPlaceholder,
  PublicShell,
} from "@/components/public/public-shell";
import { formatPHP } from "@/lib/money";
import { getPublicUnit, todayISO, type PublicAmenity } from "@/lib/public-demo";

type Params = { host: string; unit: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { host, unit } = await params;
  const found = await getPublicUnit(host, unit);
  return found
    ? {
        title: `${found.unit.name} · ${found.host.displayName}`,
        description: found.unit.description.slice(0, 150),
        robots: {
          index: found.host.publicListingEnabled,
          follow: found.host.publicListingEnabled,
        },
      }
    : { title: "Unit not found" };
}

const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function AmenityGrid({ items }: { items: PublicAmenity[] }) {
  return (
    <ul className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {items.map((amenity) => {
        const Icon = amenityIcon(amenity.icon);
        return (
          <li
            key={amenity.name}
            className="flex items-center gap-3 text-sm text-ink/80"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-pine-mist text-pine">
              <Icon className="h-4 w-4" aria-hidden />
            </span>
            {amenity.name}
          </li>
        );
      })}
    </ul>
  );
}

export default async function UnitPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<{ checkIn?: string; checkOut?: string }>;
}) {
  const { host: hostSlug, unit: unitSlug } = await params;
  const found = await getPublicUnit(hostSlug, unitSlug);
  if (!found) notFound();
  const { host, unit } = found;
  const today = todayISO();
  const hostHref = `/h/${encodeURIComponent(host.slug)}`;
  const weekendRates = Object.entries(unit.dayRates);
  const query = await searchParams;
  const initialRange =
    query.checkIn && query.checkOut && query.checkOut > query.checkIn
      ? { checkIn: query.checkIn, checkOut: query.checkOut }
      : null;
  const contactChannelIds = unit.contactChannelIds;
  const unitChannels =
    contactChannelIds === null
      ? host.channels
      : host.channels.filter((channel) =>
          contactChannelIds.includes(channel.id),
        );

  return (
    <PublicShell label={host.displayName} labelHref={hostHref}>
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <Link
          href={hostHref}
          className="inline-flex items-center gap-1 text-sm font-medium text-pine hover:underline"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          All units at {host.displayName}
        </Link>

        <div className="mt-4 grid gap-2 sm:grid-cols-4 sm:grid-rows-2">
          <PhotoPlaceholder
            src={unit.imageUrl}
            alt={`${unit.name} cover photo`}
            tone={0}
            className="aspect-[4/3] w-full rounded-xl object-cover sm:col-span-2 sm:row-span-2 sm:aspect-auto sm:h-full sm:min-h-80"
          />
          {[...unit.imageGallery, null, null, null, null]
            .slice(0, 4)
            .map((src, index) => (
              <PhotoPlaceholder
                key={`${src ?? "placeholder"}-${index}`}
                src={src}
                alt={`${unit.name} photo ${index + 2}`}
                tone={index}
                className="hidden aspect-[4/3] w-full rounded-xl object-cover sm:block"
              />
            ))}
        </div>

        <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="min-w-0 space-y-10">
            <header>
              <p className="flex items-center gap-1.5 text-sm text-ink/55">
                <MapPin className="h-4 w-4" aria-hidden />
                {unit.propertyName} · {unit.location}
              </p>
              <h1 className="mt-1 font-display text-4xl text-pine">
                {unit.name}
              </h1>
              <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-ink/75">
                <li className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-pine/70" aria-hidden />
                  Sleeps {unit.capacity}
                </li>
                <li className="flex items-center gap-2">
                  <BedDouble className="h-5 w-5 text-pine/70" aria-hidden />
                  {unit.bedrooms} {unit.bedrooms === 1 ? "bedroom" : "bedrooms"}
                </li>
                <li className="flex items-center gap-2">
                  <Bath className="h-5 w-5 text-pine/70" aria-hidden />
                  {unit.bathrooms}{" "}
                  {unit.bathrooms === 1 ? "bathroom" : "bathrooms"}
                </li>
              </ul>
            </header>

            <section aria-labelledby="about-heading">
              <h2
                id="about-heading"
                className="font-display text-2xl text-pine"
              >
                About this unit
              </h2>
              <p className="mt-3 max-w-2xl leading-relaxed text-ink/75">
                {unit.description}
              </p>
              <dl className="mt-5 grid max-w-md grid-cols-2 gap-3">
                <div className="flex items-center gap-3 rounded-xl border border-pine/12 bg-linen px-4 py-3">
                  <LogIn className="h-5 w-5 text-moss" aria-hidden />
                  <div>
                    <dt className="text-xs text-ink/55">Check-in</dt>
                    <dd className="font-medium text-pine">
                      {clockLabel(unit.checkInTime)}
                    </dd>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-pine/12 bg-linen px-4 py-3">
                  <LogOut className="h-5 w-5 text-clay" aria-hidden />
                  <div>
                    <dt className="text-xs text-ink/55">Check-out</dt>
                    <dd className="font-medium text-pine">
                      {clockLabel(unit.checkOutTime)}
                    </dd>
                  </div>
                </div>
              </dl>
            </section>

            <section aria-labelledby="amenities-heading">
              <h2
                id="amenities-heading"
                className="font-display text-2xl text-pine"
              >
                What this unit has
              </h2>
              <div className="mt-4">
                <AmenityGrid items={unit.unitAmenities} />
              </div>
              {unit.propertyAmenities.length ? (
                <>
                  <h3 className="mt-8 font-display text-lg text-pine">
                    Around {unit.propertyName}
                  </h3>
                  <div className="mt-3">
                    <AmenityGrid items={unit.propertyAmenities} />
                  </div>
                </>
              ) : null}
            </section>

            <section aria-labelledby="calendar-heading" id="calendar">
              <h2 id="calendar-heading" className="sr-only">
                Pick your dates
              </h2>
              <UnitAvailability
                today={today}
                booked={unit.booked}
                nightlyRateCents={unit.nightlyRateCents}
                dayRates={unit.dayRates}
                cleaningFeeCents={unit.cleaningFeeCents}
                channels={unitChannels}
                hostName={host.displayName}
                unitName={unit.name}
                initialRange={initialRange}
              />
            </section>

            <section aria-labelledby="rules-heading">
              <h2
                id="rules-heading"
                className="flex items-center gap-2 font-display text-2xl text-pine"
              >
                <ScrollText className="h-5 w-5 text-pine/70" aria-hidden />
                House rules
              </h2>
              <ul className="mt-4 space-y-2.5">
                {unit.guestHouseRules.map((rule) => (
                  <li key={rule} className="flex gap-3 text-ink/75">
                    <span
                      aria-hidden
                      className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-clay"
                    />
                    {rule}
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <aside className="lg:sticky lg:top-6 lg:self-start">
            <Card>
              <CardBody className="space-y-5">
                <div>
                  <p className="text-sm text-ink/55">From</p>
                  <p>
                    <span className="font-display text-3xl text-pine">
                      {formatPHP(unit.nightlyRateCents)}
                    </span>{" "}
                    <span className="text-ink/55">/ night</span>
                  </p>
                  {weekendRates.length ? (
                    <p className="mt-1 text-sm text-ink/60">
                      {weekendRates
                        .map(
                          ([day, cents]) =>
                            `${WEEKDAY[Number(day)]} ${formatPHP(cents)}`,
                        )
                        .join(" · ")}
                    </p>
                  ) : null}
                </div>
                <dl className="space-y-2 border-t border-pine/10 pt-4 text-sm">
                  {unit.cleaningFeeCents ? (
                    <div className="flex justify-between gap-4">
                      <dt className="text-ink/60">Cleaning fee</dt>
                      <dd className="font-medium text-pine">
                        {formatPHP(unit.cleaningFeeCents)}
                      </dd>
                    </div>
                  ) : null}
                  {unit.securityDepositCents ? (
                    <div className="flex justify-between gap-4">
                      <dt className="text-ink/60">Refundable deposit</dt>
                      <dd className="font-medium text-pine">
                        {formatPHP(unit.securityDepositCents)}
                      </dd>
                    </div>
                  ) : null}
                  {unit.reservationFeeLabel ? (
                    <div className="flex gap-2 text-ink/60">
                      <Clock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                      <dd>{unit.reservationFeeLabel}</dd>
                    </div>
                  ) : null}
                </dl>
                <a
                  href="#calendar"
                  className={buttonClassName("clay", "lg", "w-full")}
                >
                  Check availability
                </a>
                <div className="space-y-3 border-t border-pine/10 pt-4">
                  <p className="text-sm font-medium text-pine">
                    Message {host.displayName}
                  </p>
                  <ChannelList channels={host.channels} compact />
                </div>
              </CardBody>
            </Card>
          </aside>
        </div>
      </div>
    </PublicShell>
  );
}
