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
import { AmenityList } from "@/components/public/amenity-list";
import { UnitAvailability } from "@/components/public/unit-availability";
import { clockLabel } from "@/components/public/format";
import { ChannelList } from "@/components/public/contact-channel-list";
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
import { getPublicUnit, todayISO } from "@/lib/public-demo";
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

/** A block under the hero: a big heading, a line of help, then the content. */
function Block({
  id,
  title,
  intro,
  children,
}: {
  id: string;
  title: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby={`${id}-heading`}
      id={id}
      className="scroll-mt-6 border-t border-pine/10 py-10 first:border-t-0 first:pt-0"
    >
      <h2 id={`${id}-heading`} className="font-display text-4xl text-pine">
        {title}
      </h2>
      {intro ? <p className="mt-2 max-w-xl text-ink/60">{intro}</p> : null}
      <div className="mt-6">{children}</div>
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

const GLASS_CHIP =
  "flex items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-1.5 text-sm font-medium backdrop-blur";

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
  const heroImage = photos[0] ?? host.coverImageUrl;
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
      <main id="main" className="flex-1">
        <section className="relative isolate flex min-h-[26rem] flex-col justify-between overflow-hidden bg-pine text-white sm:min-h-[30rem]">
          {heroImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={heroImage}
              alt=""
              className="absolute inset-0 -z-20 h-full w-full object-cover"
            />
          ) : (
            <div
              aria-hidden
              className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_20%_20%,#3a5851_0%,#203a35_55%,#162925_100%)]"
            />
          )}
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-gradient-to-b from-pine-deep/60 via-pine-deep/20 to-pine-deep/85"
          />
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 pt-5 sm:px-6">
            <Link
              href={hostHref}
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-sm font-semibold text-pine shadow-md hover:bg-paper"
            >
              <CaretLeft className="h-4 w-4" aria-hidden />
              All units
            </Link>
            <span className="truncate font-display text-lg">
              {host.displayName}
            </span>
          </div>
          <div className="mx-auto w-full max-w-6xl px-4 pb-10 pt-16 sm:px-6 sm:pb-12">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-sm font-medium backdrop-blur">
              <MapPin className="h-4 w-4" aria-hidden />
              {unit.propertyName} · {unit.location}
            </p>
            <h1 className="mt-3 max-w-3xl font-display text-5xl leading-[1.05] sm:text-6xl">
              {unit.name}
            </h1>
            <ul className="mt-4 flex flex-wrap gap-2">
              <li className={GLASS_CHIP}>
                <Users className="h-4 w-4" aria-hidden />
                Sleeps {unit.capacity}
              </li>
              <li className={GLASS_CHIP}>
                <BedDouble className="h-4 w-4" aria-hidden />
                {unit.bedrooms} {unit.bedrooms === 1 ? "bedroom" : "bedrooms"}
              </li>
              <li className={GLASS_CHIP}>
                <Bath className="h-4 w-4" aria-hidden />
                {unit.bathrooms} {unit.bathrooms === 1 ? "bath" : "baths"}
              </li>
            </ul>
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
              <p className="text-white/80">
                <span className="font-display text-3xl text-white">
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
            <div className="mt-6 hidden flex-wrap items-center gap-3 sm:flex">
              <a
                href="#calendar"
                className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 font-semibold text-pine hover:bg-paper"
              >
                Pick your dates
              </a>
              <HeroChannels
                channels={unitChannels}
                className="hidden sm:flex"
              />
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
            <div className="min-w-0">
              {photos.length ? (
                <Block id="photos" title="Photos">
                  <div>
                    <PhotoCarousel photos={photos} alt={unit.name} />
                  </div>
                </Block>
              ) : null}

              <Block id="details" title="Details">
                <ul className="flex flex-wrap gap-2 text-sm font-medium text-ink/80">
                  <li className="flex items-center gap-1.5 rounded-lg bg-pine-mist px-3 py-1.5">
                    <Users className="h-4 w-4 text-pine" aria-hidden />
                    Sleeps {unit.capacity}
                  </li>
                  <li className="flex items-center gap-1.5 rounded-lg bg-pine-mist px-3 py-1.5">
                    <BedDouble className="h-4 w-4 text-pine" aria-hidden />
                    {unit.bedrooms}{" "}
                    {unit.bedrooms === 1 ? "bedroom" : "bedrooms"}
                  </li>
                  <li className="flex items-center gap-1.5 rounded-lg bg-pine-mist px-3 py-1.5">
                    <Bath className="h-4 w-4 text-pine" aria-hidden />
                    {unit.bathrooms} {unit.bathrooms === 1 ? "bath" : "baths"}
                  </li>
                </ul>
                {unit.description ? (
                  <p className="mt-5 max-w-2xl whitespace-pre-line leading-relaxed text-ink/75">
                    {unit.description}
                  </p>
                ) : null}
                <dl className="mt-6 grid max-w-md grid-cols-2 gap-3">
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
                {unit.reservationFeeLabel ? (
                  <p className="mt-4 flex max-w-2xl gap-2 text-sm text-ink/65">
                    <Clock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    {unit.reservationFeeLabel}
                  </p>
                ) : null}
              </Block>

              <Block
                id="calendar"
                title="Free dates"
                intro="Choose your check-in and check-out. The squares show the next 14 nights: light is free, grey is booked."
              >
                <div className="mb-6 max-w-xl">
                  <AvailabilityStrip booked={unit.booked} today={today} />
                </div>
                <div className="max-w-3xl">
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
                </div>
              </Block>

              {unit.unitAmenities.length || unit.propertyAmenities.length ? (
                <Block id="amenities" title="What is included">
                  <AmenityList
                    unitAmenities={unit.unitAmenities}
                    propertyAmenities={unit.propertyAmenities}
                    propertyName={unit.propertyName}
                  />
                </Block>
              ) : null}

              {unit.guestHouseRules.length ? (
                <Block id="rules" title="House rules">
                  <ul className="max-w-2xl space-y-2.5">
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
                </Block>
              ) : null}
            </div>
            <aside
              className="hidden lg:block lg:sticky lg:top-6"
              aria-label="Book this unit"
            >
              <div className="rounded-3xl border border-pine/12 bg-surface p-6 shadow-[0_10px_30px_rgba(32,58,53,0.10)]">
                <p className="text-sm text-ink/55">From</p>
                <p className="mt-0.5">
                  <span className="font-display text-4xl text-pine">
                    {formatPHP(unit.nightlyRateCents)}
                  </span>{" "}
                  <span className="text-ink/55">/ night</span>
                </p>
                <div className="mt-3">
                  <Badge tone={openNow ? "sage" : "clay"}>
                    {openNow
                      ? "Open tonight"
                      : open
                        ? `Next open ${shortDate(open)}`
                        : "Fully booked"}
                  </Badge>
                </div>
                <div className="mt-4">
                  <AvailabilityStrip booked={unit.booked} today={today} />
                </div>
                <a
                  href="#calendar"
                  className={buttonClassName("clay", "lg", "mt-5 w-full")}
                >
                  Pick your dates
                </a>
                <p className="mt-3 text-center text-xs text-ink/55">
                  Your stay and payment are arranged directly with the host.
                </p>
                <div className="mt-5 border-t border-pine/10 pt-5">
                  <p className="mb-3 text-sm font-medium text-pine">
                    Questions? Message {host.displayName}
                  </p>
                  <ChannelList channels={unitChannels} compact />
                </div>
              </div>
            </aside>
          </div>

          <section
            aria-labelledby="how-heading"
            className="mt-4 grid gap-8 rounded-3xl bg-pine-mist p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start"
          >
            <div>
              <h2 id="how-heading" className="font-display text-3xl text-pine">
                How to book
              </h2>
              <ol className="mt-5 space-y-4">
                {STEPS.map(([title, detail], index) => (
                  <li key={title} className="flex gap-3">
                    <span
                      aria-hidden
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white font-semibold text-pine"
                    >
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium text-pine">{title}</p>
                      <p className="text-sm text-ink/65">{detail}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            <div>
              <h3 className="mb-3 font-display text-xl text-pine">
                Message {host.displayName}
              </h3>
              <ChannelList channels={unitChannels} />
            </div>
          </section>
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
