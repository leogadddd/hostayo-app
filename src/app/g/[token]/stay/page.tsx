import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Bath, BedDouble, Clock, LogIn, LogOut, MapPin, ScrollText, Sparkles, Users, Wifi } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { amenityIcon } from "@/app/(app)/properties/amenity-icons";
import { clockLabel, LONG_DATE } from "@/components/public/format";
import { ChannelList } from "@/components/public/contact-channel-list";
import { PublicShell } from "@/components/public/public-shell";
import { getGuestStay } from "@/lib/public-demo";
import { QuickLinks, StayActions, WifiCard } from "./stay-actions";

export const metadata: Metadata = {
  title: "Your stay",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export const dynamic = "force-dynamic";

const STATUS: Record<string, { label: string; tone: "sage" | "clay" | "neutral" }> = {
  confirmed: { label: "Booked", tone: "sage" },
  checked_in: { label: "Checked in", tone: "sage" },
  checked_out: { label: "Checked out", tone: "neutral" },
};

function SectionCard({ id, icon: Icon, title, children }: { id?: string; icon: typeof Wifi; title: string; children: React.ReactNode }) {
  return (
    <Card id={id} className="scroll-mt-4">
      <CardBody>
        <h2 className="flex items-center gap-2.5 font-display text-xl text-pine">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-pine-mist text-pine"><Icon className="h-[18px] w-[18px]" aria-hidden /></span>
          {title}
        </h2>
        <div className="mt-4">{children}</div>
      </CardBody>
    </Card>
  );
}

export default async function GuestStayPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const stay = await getGuestStay(token);

  if (!stay) {
    return (
      <PublicShell>
        <div className="mx-auto max-w-lg px-4 py-16">
          <Card>
            <CardBody className="py-10 text-center">
              <h1 className="font-display text-2xl text-pine">This link is not valid</h1>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink/60">The link may have expired or the address may be incomplete. Please ask your host for a new one.</p>
            </CardBody>
          </Card>
        </div>
      </PublicShell>
    );
  }

  const { unit, host } = stay;
  const status = STATUS[stay.status] ?? { label: "Booked", tone: "sage" as const };
  const firstName = stay.guestName.split(" ")[0];

  return (
    <PublicShell label="Your stay">
      <section className="relative isolate overflow-hidden border-b border-pine/10 bg-pine text-paper">
        <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_80%_0%,#3a5851_0%,#203a35_55%,#162925_100%)]" />
        <div className="mx-auto max-w-2xl px-4 pb-10 pt-10 sm:px-6">
          <Badge tone={status.tone} className="mb-4">{status.label}</Badge>
          <h1 className="font-display text-4xl leading-tight sm:text-5xl">Welcome, {firstName}.</h1>
          <p className="mt-3 text-lg text-paper/75">We’re glad you’re here. Everything you need for your stay at <span className="text-paper">{unit.name}</span> is on this page.</p>
          <dl className="mt-8 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-paper/15 bg-paper/5 p-4">
              <dt className="flex items-center gap-2 text-xs text-sage"><LogIn className="h-4 w-4" aria-hidden />Check-in</dt>
              <dd className="mt-1 font-medium">{LONG_DATE.format(new Date(`${stay.checkInDate}T00:00:00Z`))}</dd>
              <dd className="text-sm text-paper/65">from {clockLabel(unit.checkInTime)}</dd>
            </div>
            <div className="rounded-xl border border-paper/15 bg-paper/5 p-4">
              <dt className="flex items-center gap-2 text-xs text-sage"><LogOut className="h-4 w-4" aria-hidden />Check-out</dt>
              <dd className="mt-1 font-medium">{LONG_DATE.format(new Date(`${stay.checkOutDate}T00:00:00Z`))}</dd>
              <dd className="text-sm text-paper/65">by {clockLabel(unit.checkOutTime)}</dd>
            </div>
          </dl>
        </div>
      </section>

      <div className="mx-auto max-w-2xl space-y-4 px-4 py-8 sm:px-6">
        <QuickLinks wifi={!!unit.wifiName} mapUrl={stay.mapUrl} phone={host.channels.find((channel) => channel.kind === "phone" && channel.enabled)?.value ?? null} />

        <SectionCard icon={MapPin} title="Getting in">
          <p className="text-sm text-ink/60">{unit.propertyName} · {stay.address}</p>
          <ol className="mt-4 space-y-3">
            {unit.arrivalNotes.map((note, index) => (
              <li key={note} className="flex gap-3 text-sm leading-relaxed text-ink/80">
                <span aria-hidden className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sage text-xs font-semibold text-pine">{index + 1}</span>
                {note}
              </li>
            ))}
          </ol>
        </SectionCard>

        {unit.wifiName ? (
          <SectionCard id="wifi" icon={Wifi} title="Wi-Fi">
            <WifiCard name={unit.wifiName} password={unit.wifiPassword} />
          </SectionCard>
        ) : null}

        <SectionCard icon={Sparkles} title={`About ${unit.name}`}>
          <p className="text-sm leading-relaxed text-ink/75">{unit.description}</p>
          <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink/70">
            <li className="flex items-center gap-2"><Users className="h-4 w-4 text-pine/70" aria-hidden />Sleeps {unit.capacity}</li>
            <li className="flex items-center gap-2"><BedDouble className="h-4 w-4 text-pine/70" aria-hidden />{unit.bedrooms} bedrooms</li>
            <li className="flex items-center gap-2"><Bath className="h-4 w-4 text-pine/70" aria-hidden />{unit.bathrooms} bathrooms</li>
          </ul>
        </SectionCard>

        <SectionCard icon={Sparkles} title="What’s included">
          <ul className="flex flex-wrap gap-2">
            {[...unit.unitAmenities, ...unit.propertyAmenities].map((amenity) => {
              const Icon = amenityIcon(amenity.icon);
              return <li key={amenity.name} className="inline-flex items-center gap-1.5 rounded-full bg-pine-mist px-3 py-1.5 text-sm text-pine"><Icon className="h-4 w-4" aria-hidden />{amenity.name}</li>;
            })}
          </ul>
        </SectionCard>

        <SectionCard icon={ScrollText} title="House rules">
          <ul className="space-y-2.5">
            {unit.guestHouseRules.map((rule) => (
              <li key={rule} className="flex gap-3 text-sm leading-relaxed text-ink/80"><span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-clay" />{rule}</li>
            ))}
          </ul>
        </SectionCard>

        {unit.areaTips.length ? (
          <SectionCard icon={MapPin} title="Around the area">
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
          steps={unit.checkoutSteps}
          initiallyCheckedOut={stay.status === "checked_out"}
        />

        <Card className="bg-sage/35">
          <CardBody>
            <h2 className="font-display text-xl text-pine">Your host</h2>
            <p className="mt-1 text-sm text-ink/65">{host.displayName} is a message away if you need anything.</p>
            <ChannelList channels={host.channels} className="mt-4" compact />
          </CardBody>
        </Card>

        <Link href={`/g/${encodeURIComponent(token)}`} prefetch={false} className="flex items-center justify-between gap-3 rounded-xl border border-pine/12 bg-linen px-5 py-4 text-sm font-medium text-pine shadow-[0_2px_8px_rgba(32,58,53,0.035)] hover:border-pine/30">
          <span className="flex items-center gap-2.5"><Clock className="h-4 w-4 text-pine/70" aria-hidden />Booking status and payments</span>
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </PublicShell>
  );
}
