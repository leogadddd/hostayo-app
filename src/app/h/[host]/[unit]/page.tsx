import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Bathtub as Bath,
  Bed as BedDouble,
  CaretLeft,
  Clock,
  SignIn as LogIn,
  SignOut as LogOut,
  MapPin,
  Users,
} from "@/components/ui/icons";
import { Badge } from "@/components/ui/badge";
import { buttonClassName } from "@/components/ui/button";
import { amenityIcon } from "@/app/(app)/properties/amenity-icons";
import { UnitAvailability } from "@/components/public/unit-availability";
import { clockLabel } from "@/components/public/format";
import { PhotoCarousel } from "@/components/public/photo-carousel";
import {
  AvailabilityStrip,
  HeroChannels,
  ShowcaseFooter,
  shortDate,
} from "@/components/public/showcase";
import { nextOpenDate } from "@/lib/public-availability";
import { formatPHP } from "@/lib/money";
import { JsonLd } from "@/components/json-ld";
import { getPublicUnit, todayISO, type PublicAmenity } from "@/lib/public-demo";
import { absoluteUrl, APP_URL } from "@/lib/site";

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
        alternates: {
          canonical: `/h/${encodeURIComponent(host)}/${encodeURIComponent(unit)}`,
        },
        openGraph: {
          type: "website",
          url: `/h/${encodeURIComponent(host)}/${encodeURIComponent(unit)}`,
          title: `${found.unit.name} · ${found.host.displayName}`,
          description: found.unit.description.slice(0, 150),
          ...(found.unit.imageUrl
            ? { images: [absoluteUrl(found.unit.imageUrl)] }
            : {}),
        },
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

function Box({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby={`${id}-heading`}
      className="rounded-2xl border border-pine/12 bg-surface p-5 sm:p-6"
    >
      <h2 id={`${id}-heading`} className="mb-4 font-display text-xl text-pine">
        {title}
      </h2>
      {children}
    </section>
  );
}

const STEPS = [
  ["Pick your dates", "Check the calendar and choose your nights."],
  [
    "Message the host",
    "Send your dates and number of guests through any channel.",
  ],
  ["Get confirmation", "The host confirms and arranges payment with you."],
] as const;

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
  const photos = [unit.imageUrl, ...unit.imageGallery].filter(
    (src): src is string => Boolean(src),
  );
  const open = nextOpenDate(unit.booked, today);
  const openNow = open === today;

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      {host.publicListingEnabled ? (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "Accommodation",
            name: unit.name,
            description: unit.description,
            url: `${APP_URL}${hostHref}/${encodeURIComponent(unit.slug)}`,
            ...(unit.imageUrl ? { image: absoluteUrl(unit.imageUrl) } : {}),
            numberOfBedrooms: unit.bedrooms,
            numberOfBathroomsTotal: unit.bathrooms,
            occupancy: {
              "@type": "QuantitativeValue",
              maxValue: unit.capacity,
            },
            amenityFeature: [
              ...unit.unitAmenities,
              ...unit.propertyAmenities,
            ].map((a) => ({
              "@type": "LocationFeatureSpecification",
              name: a.name,
              value: true,
            })),
            containedInPlace: {
              "@type": "LodgingBusiness",
              name: host.displayName,
              url: `${APP_URL}${hostHref}`,
              address: {
                "@type": "PostalAddress",
                addressLocality: unit.location,
                addressCountry: "PH",
              },
            },
          }}
        />
      ) : null}
      <header className="sticky top-0 z-20 border-b border-pine/10 bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link
            href={hostHref}
            className="inline-flex min-w-0 items-center gap-1.5 font-medium text-pine hover:underline"
          >
            <CaretLeft className="h-4 w-4 shrink-0" aria-hidden />
            <span className="truncate">All units</span>
          </Link>
          <HeroChannels
            channels={unitChannels}
            tone="light"
            collapseOnMobile
            className="flex-nowrap"
          />
        </div>
      </header>

      <main
        id="main"
        className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6"
      >
        <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-start">
          <PhotoCarousel photos={photos} alt={unit.name} />
          <section className="rounded-2xl border border-pine/12 bg-surface p-5 sm:p-6">
            <p className="flex items-center gap-1.5 text-sm text-ink/55">
              <MapPin className="h-4 w-4" aria-hidden />
              {unit.propertyName} · {unit.location}
            </p>
            <h1 className="mt-1 font-display text-4xl text-pine">
              {unit.name}
            </h1>
            <p className="mt-1 text-sm text-ink/55">
              Hosted by {host.displayName}
            </p>
            <ul className="mt-4 flex flex-wrap gap-2 text-sm font-medium text-ink/80">
              <li className="flex items-center gap-1.5 rounded-lg bg-pine-mist px-3 py-1.5">
                <Users className="h-4 w-4 text-pine" aria-hidden />
                Sleeps {unit.capacity}
              </li>
              <li className="flex items-center gap-1.5 rounded-lg bg-pine-mist px-3 py-1.5">
                <BedDouble className="h-4 w-4 text-pine" aria-hidden />
                {unit.bedrooms} {unit.bedrooms === 1 ? "bedroom" : "bedrooms"}
              </li>
              <li className="flex items-center gap-1.5 rounded-lg bg-pine-mist px-3 py-1.5">
                <Bath className="h-4 w-4 text-pine" aria-hidden />
                {unit.bathrooms} {unit.bathrooms === 1 ? "bath" : "baths"}
              </li>
            </ul>
            {unit.description ? (
              <p className="mt-4 leading-relaxed text-ink/75">
                {unit.description}
              </p>
            ) : null}
            <dl className="mt-4 grid grid-cols-2 gap-3">
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
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-pine/10 pt-4">
              <p className="text-ink/55">
                <span className="font-display text-2xl text-pine">
                  {formatPHP(unit.nightlyRateCents)}
                </span>{" "}
                / night
              </p>
              <Badge tone={openNow ? "sage" : "clay"}>
                {openNow
                  ? "Open tonight"
                  : open
                    ? `Next open ${shortDate(open)}`
                    : "Fully booked"}
              </Badge>
            </div>
            <div className="mt-3">
              <AvailabilityStrip booked={unit.booked} today={today} />
            </div>
          </section>
        </div>

        <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-start">
          <div className="min-w-0 space-y-6">
            <section aria-label="Available dates" id="calendar">
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
            {unit.unitAmenities.length || unit.propertyAmenities.length ? (
              <Box id="amenities" title="What is included">
                {unit.unitAmenities.length ? (
                  <AmenityGrid items={unit.unitAmenities} />
                ) : null}
                {unit.propertyAmenities.length ? (
                  <>
                    <h3 className="mb-3 mt-6 font-display text-lg text-pine">
                      Around {unit.propertyName}
                    </h3>
                    <AmenityGrid items={unit.propertyAmenities} />
                  </>
                ) : null}
              </Box>
            ) : null}
          </div>

          <div className="min-w-0 space-y-6">
            <Box id="rates" title="Rates">
              <dl className="divide-y divide-pine/10 text-sm">
                <div className="flex justify-between gap-4 py-2.5">
                  <dt className="text-ink/65">Per night</dt>
                  <dd className="font-semibold text-pine">
                    {formatPHP(unit.nightlyRateCents)}
                  </dd>
                </div>
                {weekendRates.map(([day, cents]) => (
                  <div key={day} className="flex justify-between gap-4 py-2.5">
                    <dt className="text-ink/65">
                      {WEEKDAY[Number(day)]} night
                    </dt>
                    <dd className="font-semibold text-pine">
                      {formatPHP(cents)}
                    </dd>
                  </div>
                ))}
                {unit.cleaningFeeCents ? (
                  <div className="flex justify-between gap-4 py-2.5">
                    <dt className="text-ink/65">Cleaning fee</dt>
                    <dd className="font-semibold text-pine">
                      {formatPHP(unit.cleaningFeeCents)}
                    </dd>
                  </div>
                ) : null}
                {unit.securityDepositCents ? (
                  <div className="flex justify-between gap-4 py-2.5">
                    <dt className="text-ink/65">Refundable deposit</dt>
                    <dd className="font-semibold text-pine">
                      {formatPHP(unit.securityDepositCents)}
                    </dd>
                  </div>
                ) : null}
                {unit.reservationFeeLabel ? (
                  <div className="flex gap-2 py-2.5 text-ink/65">
                    <Clock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    <dd>{unit.reservationFeeLabel}</dd>
                  </div>
                ) : null}
              </dl>
            </Box>

            <Box id="how" title="How to book">
              <ol className="space-y-4">
                {STEPS.map(([title, detail], index) => (
                  <li key={title} className="flex gap-3">
                    <span
                      aria-hidden
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-pine-mist font-semibold text-pine"
                    >
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium text-pine">{title}</p>
                      <p className="text-sm text-ink/60">{detail}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </Box>

            {unit.guestHouseRules.length ? (
              <Box id="rules" title="House rules">
                <ul className="space-y-2.5">
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
              </Box>
            ) : null}
          </div>
        </div>
      </main>
      <ShowcaseFooter location={unit.location} />
      <div className="sticky bottom-0 z-20 flex items-center justify-between gap-4 border-t border-pine/10 bg-surface/95 px-4 py-3 backdrop-blur lg:hidden">
        <p className="text-sm text-ink/55">
          <span className="block font-display text-xl leading-tight text-pine">
            {formatPHP(unit.nightlyRateCents)}
          </span>
          / night
        </p>
        <a href="#calendar" className={buttonClassName("clay", "lg")}>
          Pick your dates
        </a>
      </div>
    </div>
  );
}
