import Link from "next/link";
import {
  ArrowRight,
  Bathtub as Bath,
  Bed as BedDouble,
  Users,
} from "@/components/ui/icons";
import { Badge } from "@/components/ui/badge";
import { amenityIcon } from "@/app/(app)/properties/amenity-icons";
import { formatPHP } from "@/lib/money";
import { nextOpenDate } from "@/lib/public-availability";
import type { PublicUnit } from "@/lib/public-demo";
import { cn } from "@/lib/utils";
import { PhotoPlaceholder } from "./public-shell";
import { AvailabilityStrip, shortDate } from "./showcase";

/** One unit on the host page: photos, what it has, its rate and when it is free. */
export function UnitRow({
  unit,
  href,
  today,
  index,
}: {
  unit: PublicUnit;
  href: string;
  today: string;
  index: number;
}) {
  const open = nextOpenDate(unit.booked, today);
  const openNow = open === today;
  const photos = [unit.imageUrl, ...unit.imageGallery].filter(
    (src): src is string => Boolean(src),
  );
  const flipped = index % 2 === 1;
  return (
    <article
      className={cn(
        "grid gap-6 border-t border-pine/10 py-8 lg:items-center lg:gap-10",
        flipped
          ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]"
          : "lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]",
      )}
    >
      <Link
        href={href}
        aria-label={`${unit.name}: see photos and dates`}
        className={cn(
          "grid h-64 gap-2 overflow-hidden sm:h-72",
          photos.length >= 3
            ? "grid-cols-[2fr_1fr] grid-rows-2"
            : "grid-cols-1",
          flipped && "lg:order-2",
        )}
      >
        <PhotoPlaceholder
          src={photos[0] ?? null}
          alt={`${unit.name} cover photo`}
          tone={index}
          className={cn(
            "h-full w-full rounded-2xl object-cover",
            photos.length >= 3 && "row-span-2",
          )}
        />
        {photos.length >= 3
          ? photos
              .slice(1, 3)
              .map((src, i) => (
                <PhotoPlaceholder
                  key={src}
                  src={src}
                  alt={`${unit.name} photo ${i + 2}`}
                  tone={index + i}
                  className="h-full w-full rounded-2xl object-cover"
                />
              ))
          : null}
      </Link>
      <div className="min-w-0">
        <h3 className="font-display text-3xl text-pine">
          <Link href={href} className="hover:underline">
            {unit.name}
          </Link>
        </h3>
        <p className="mt-1 text-ink/60">{unit.propertyName}</p>
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
          {unit.unitAmenities.slice(0, 2).map((amenity) => {
            const Icon = amenityIcon(amenity.icon);
            return (
              <li
                key={amenity.name}
                className="flex items-center gap-1.5 rounded-lg bg-pine-mist px-3 py-1.5"
              >
                <Icon className="h-4 w-4 text-pine" aria-hidden />
                {amenity.name}
              </li>
            );
          })}
        </ul>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
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
        <Link
          href={href}
          className="mt-5 inline-flex h-11 items-center gap-2 rounded-lg bg-pine px-5 font-medium text-white transition-colors hover:bg-pine-soft"
        >
          See dates and book
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </article>
  );
}
