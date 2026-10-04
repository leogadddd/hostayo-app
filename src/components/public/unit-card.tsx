import Link from "next/link";
import { ArrowRight, Bath, BedDouble, MapPin, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { amenityIcon } from "@/app/(app)/properties/amenity-icons";
import { formatPHP } from "@/lib/money";
import type { PublicUnit } from "@/lib/public-demo";
import { PhotoPlaceholder } from "./public-shell";

export function nextOpenDate(unit: PublicUnit, today: string) {
  let day = today;
  const step = (date: string) => {
    const next = new Date(`${date}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    return next.toISOString().slice(0, 10);
  };
  for (let i = 0; i < 365; i += 1) {
    if (!unit.booked.some((range) => day >= range.checkIn && day < range.checkOut)) return day;
    day = step(day);
  }
  return null;
}

const OPEN_LABEL = new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", timeZone: "UTC" });

export function UnitCard({ unit, href, today, tone }: { unit: PublicUnit; href: string; today: string; tone: number }) {
  const open = nextOpenDate(unit, today);
  const openNow = open === today;
  return (
    <Link href={href} className="group flex flex-col overflow-hidden rounded-xl border border-pine/12 bg-linen shadow-[0_2px_8px_rgba(32,58,53,0.035)] transition hover:-translate-y-0.5 hover:border-pine/25 hover:shadow-[0_8px_24px_rgba(32,58,53,0.10)]">
      <div className="relative">
        <PhotoPlaceholder src={unit.imageUrl} alt={`${unit.name} photo`} tone={tone} className="aspect-[4/3] w-full object-cover" />
        <Badge tone={openNow ? "sage" : "clay"} className="absolute left-3 top-3 shadow-sm">
          {openNow ? "Open tonight" : open ? `Next open ${OPEN_LABEL.format(new Date(`${open}T00:00:00Z`))}` : "Fully booked"}
        </Badge>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-xl text-pine">{unit.name}</h3>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-ink/55"><MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />{unit.propertyName}</p>
        <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-ink/70">
          <li className="flex items-center gap-1.5"><Users className="h-4 w-4 text-pine/70" aria-hidden />Sleeps {unit.capacity}</li>
          <li className="flex items-center gap-1.5"><BedDouble className="h-4 w-4 text-pine/70" aria-hidden />{unit.bedrooms} bed</li>
          <li className="flex items-center gap-1.5"><Bath className="h-4 w-4 text-pine/70" aria-hidden />{unit.bathrooms} bath</li>
        </ul>
        <ul className="mt-4 flex flex-wrap gap-2" aria-label="Top amenities">
          {unit.unitAmenities.slice(0, 4).map((amenity) => {
            const Icon = amenityIcon(amenity.icon);
            return <li key={amenity.name} className="inline-flex items-center gap-1.5 rounded-full bg-pine-mist px-2.5 py-1 text-xs text-pine"><Icon className="h-3.5 w-3.5" aria-hidden />{amenity.name}</li>;
          })}
        </ul>
        <div className="mt-auto flex items-end justify-between pt-5">
          <p className="text-sm text-ink/55"><span className="font-display text-xl text-pine">{formatPHP(unit.nightlyRateCents)}</span> / night</p>
          <span className="inline-flex items-center gap-1 text-sm font-medium text-clay-deep">View unit<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden /></span>
        </div>
      </div>
    </Link>
  );
}
