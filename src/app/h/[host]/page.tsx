import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MapPin, CalendarHeart } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { ChannelList } from "@/components/public/contact-channel-list";
import { PublicShell } from "@/components/public/public-shell";
import { UnitCard } from "@/components/public/unit-card";
import { getPublicHost, todayISO } from "@/lib/public-demo";

type Params = { host: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const host = await getPublicHost((await params).host);
  return host ? { title: `${host.displayName} · Stays`, description: host.tagline, robots: { index: host.publicListingEnabled, follow: host.publicListingEnabled } } : { title: "Host not found" };
}

export default async function HostPage({ params }: { params: Promise<Params> }) {
  const { host: slug } = await params;
  const host = await getPublicHost(slug);
  if (!host) notFound();
  const today = todayISO();
  const initials = host.displayName.split(" ").map((word) => word[0]).slice(0, 2).join("");

  return (
    <PublicShell label={host.displayName}>
      <section className="relative isolate overflow-hidden border-b border-pine/10 bg-pine text-paper">
        <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,#3a5851_0%,#203a35_55%,#162925_100%)]" />
        <div className="mx-auto max-w-6xl px-4 pb-14 pt-12 sm:px-6 sm:pt-16">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            {host.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={host.logoUrl} alt="" className="h-24 w-24 rounded-2xl border border-paper/20 object-cover" />
            ) : (
              <span aria-hidden className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border border-paper/20 bg-paper/10 font-display text-3xl text-paper">{initials}</span>
            )}
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-sm text-sage"><MapPin className="h-4 w-4" aria-hidden />{host.location}</p>
              <h1 className="mt-1 font-display text-4xl leading-tight sm:text-5xl">{host.displayName}</h1>
              <p className="mt-3 max-w-2xl text-lg leading-relaxed text-paper/75">{host.tagline}</p>
            </div>
          </div>
          <dl className="mt-10 grid max-w-xl grid-cols-3 gap-3 text-center">
            {[
              [String(host.units.length), host.units.length === 1 ? "Unit" : "Units"],
              [`Since ${host.hostingSince}`, "Hosting"],
              [String(Math.max(...host.units.map((unit) => unit.capacity))), "Max guests"],
            ].map(([value, label]) => (
              <div key={label} className="rounded-xl border border-paper/15 bg-paper/5 px-3 py-4">
                <dt className="sr-only">{label}</dt>
                <dd className="font-display text-xl">{value}</dd>
                <p aria-hidden className="mt-0.5 text-xs text-paper/60">{label}</p>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-12">
          <section aria-labelledby="units-heading">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 id="units-heading" className="font-display text-3xl text-pine">Choose your stay</h2>
                <p className="mt-1 text-sm text-ink/60">Every unit has its own calendar. Open one to see which days are free.</p>
              </div>
              <p className="text-sm text-ink/55">{host.units.length} {host.units.length === 1 ? "unit" : "units"}</p>
            </div>
            {host.units.length ? (
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                {host.units.map((unit, index) => (
                  <UnitCard key={unit.id} unit={unit} tone={index} today={today} href={`/h/${encodeURIComponent(host.slug)}/${encodeURIComponent(unit.slug)}`} />
                ))}
              </div>
            ) : (
              <Card className="mt-6">
                <CardBody className="py-12 text-center">
                  <CalendarHeart className="mx-auto h-8 w-8 text-pine/50" aria-hidden />
                  <p className="mt-3 font-display text-xl text-pine">No units open right now</p>
                  <p className="mx-auto mt-1 max-w-sm text-sm text-ink/60">Check back soon, or reach out to the host directly.</p>
                </CardBody>
              </Card>
            )}
          </section>

          <section aria-labelledby="about-heading">
            <h2 id="about-heading" className="font-display text-3xl text-pine">About {host.displayName}</h2>
            <p className="mt-3 max-w-2xl whitespace-pre-line leading-relaxed text-ink/75">{host.about}</p>
          </section>
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <Card>
            <CardBody className="space-y-4">
              <h2 className="font-display text-xl text-pine">Get in touch</h2>
              <p className="text-sm leading-relaxed text-ink/65">Questions about a unit or your dates? Message the host the way that suits you.</p>
              <ChannelList channels={host.channels} />
              <p className="text-xs leading-relaxed text-ink/50">Hostayo runs the booking tools. Your payment and stay are arranged directly with the host.</p>
            </CardBody>
          </Card>
        </aside>
      </div>
    </PublicShell>
  );
}
