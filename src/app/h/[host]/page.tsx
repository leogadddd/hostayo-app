import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarHeart, MapPin } from "@/components/ui/icons";
import { Card, CardBody } from "@/components/ui/card";
import { ChannelList } from "@/components/public/contact-channel-list";
import { HeroChannels, ShowcaseFooter } from "@/components/public/showcase";
import { UnitRow } from "@/components/public/unit-row";
import { JsonLd } from "@/components/json-ld";
import { getPublicHost, todayISO } from "@/lib/public-demo";
import { absoluteUrl, APP_URL } from "@/lib/site";

type Params = { host: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const host = await getPublicHost((await params).host);
  return host
    ? {
        title: `${host.displayName} · Stays`,
        description: host.tagline,
        alternates: { canonical: `/h/${encodeURIComponent(host.slug)}` },
        openGraph: {
          type: "website",
          url: `/h/${encodeURIComponent(host.slug)}`,
          title: `${host.displayName} · Stays`,
          description: host.tagline,
        },
        robots: {
          index: host.publicListingEnabled,
          follow: host.publicListingEnabled,
        },
      }
    : { title: "Host not found" };
}

export default async function HostPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { host: slug } = await params;
  const host = await getPublicHost(slug);
  if (!host) notFound();
  const today = todayISO();
  const initials = host.displayName
    .split(" ")
    .map((word) => word[0])
    .slice(0, 2)
    .join("");

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      {host.publicListingEnabled ? (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "LodgingBusiness",
            name: host.displayName,
            description: host.tagline,
            url: `${APP_URL}/h/${encodeURIComponent(host.slug)}`,
            ...(host.logoUrl ? { image: absoluteUrl(host.logoUrl) } : {}),
            address: {
              "@type": "PostalAddress",
              addressLocality: host.location,
              addressCountry: "PH",
            },
          }}
        />
      ) : null}
      <main id="main" className="flex-1">
        <section className="relative isolate flex min-h-[26rem] flex-col justify-between overflow-hidden bg-pine text-white sm:min-h-[30rem]">
          {host.coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={host.coverImageUrl}
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
          <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 pt-5 sm:px-6">
            {host.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={host.logoUrl}
                alt=""
                className="h-9 w-9 rounded-xl border border-white/30 object-cover"
              />
            ) : (
              <span
                aria-hidden
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-sm font-semibold text-pine"
              >
                {initials}
              </span>
            )}
            <span className="truncate font-display text-lg">
              {host.displayName}
            </span>
          </div>
          <div className="mx-auto w-full max-w-6xl px-4 pb-10 pt-16 sm:px-6 sm:pb-12">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-sm font-medium backdrop-blur">
              <MapPin className="h-4 w-4" aria-hidden />
              {host.location}
            </p>
            <h1 className="mt-3 max-w-3xl font-display text-5xl leading-[1.05] sm:text-6xl">
              {host.displayName}
            </h1>
            {host.tagline ? (
              <p className="mt-3 max-w-xl text-lg leading-relaxed text-white/90">
                {host.tagline}
              </p>
            ) : null}
            <HeroChannels channels={host.channels} className="mt-6" />
          </div>
        </section>

        <div className="mx-auto max-w-6xl px-4 pb-6 pt-12 sm:px-6">
          <section aria-labelledby="units-heading" id="units">
            <h2 id="units-heading" className="font-display text-4xl text-pine">
              Our units
            </h2>
            <p className="mt-2 max-w-xl text-ink/60">
              Every unit has its own calendar. The squares show the next 14
              nights: light is free, grey is booked.
            </p>
            {host.units.length ? (
              <div className="mt-6">
                {host.units.map((unit, index) => (
                  <UnitRow
                    key={unit.id}
                    unit={unit}
                    index={index}
                    today={today}
                    href={`/h/${encodeURIComponent(host.slug)}/${encodeURIComponent(unit.slug)}`}
                  />
                ))}
              </div>
            ) : (
              <Card className="mt-6">
                <CardBody className="py-12 text-center">
                  <CalendarHeart
                    className="mx-auto h-8 w-8 text-pine/50"
                    aria-hidden
                  />
                  <p className="mt-3 font-display text-xl text-pine">
                    No units open right now
                  </p>
                  <p className="mx-auto mt-1 max-w-sm text-sm text-ink/60">
                    Check back soon, or reach out to the host directly.
                  </p>
                </CardBody>
              </Card>
            )}
          </section>

          <section
            aria-labelledby="about-heading"
            className="mt-10 grid gap-8 rounded-3xl bg-pine-mist p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start"
          >
            <div>
              <h2
                id="about-heading"
                className="font-display text-3xl text-pine"
              >
                About {host.displayName}
              </h2>
              {host.about ? (
                <p className="mt-3 max-w-2xl whitespace-pre-line leading-relaxed text-ink/75">
                  {host.about}
                </p>
              ) : null}
              <p className="mt-3 text-sm text-ink/60">
                Hosting since {host.hostingSince}. Questions about a unit or
                your dates? Message the host the way that suits you. Your
                payment and stay are arranged directly with them.
              </p>
            </div>
            <div>
              <h3 className="mb-3 font-display text-xl text-pine">
                Get in touch
              </h3>
              <ChannelList channels={host.channels} />
            </div>
          </section>
        </div>
      </main>
      <ShowcaseFooter location={host.location} />
    </div>
  );
}
