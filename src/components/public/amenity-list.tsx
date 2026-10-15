"use client";

import { useId, useState } from "react";
import { CaretDown } from "@/components/ui/icons";
import { amenityIcon } from "@/app/(app)/properties/amenity-icons";
import type { PublicAmenity } from "@/lib/public-demo";
import { cn } from "@/lib/utils";

const PREVIEW_COUNT = 8;

function Chips({ items }: { items: PublicAmenity[] }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((amenity) => {
        const Icon = amenityIcon(amenity.icon);
        return (
          <li
            key={amenity.name}
            className="flex items-center gap-1.5 rounded-lg bg-pine-mist px-3 py-1.5 text-sm font-medium text-ink/80"
          >
            <Icon className="h-4 w-4 shrink-0 text-pine" aria-hidden />
            {amenity.name}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * A unit's amenities as chips: the first few, and a button that reveals the
 * full list, grouped into what the unit has and what the property offers.
 */
export function AmenityList({
  unitAmenities,
  propertyAmenities,
  propertyName,
}: {
  unitAmenities: PublicAmenity[];
  propertyAmenities: PublicAmenity[];
  propertyName: string;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const total = unitAmenities.length + propertyAmenities.length;
  const collapsible = total > PREVIEW_COUNT;
  const preview = [...unitAmenities, ...propertyAmenities].slice(
    0,
    PREVIEW_COUNT,
  );

  return (
    <div>
      <div id={panelId}>
        {open || !collapsible ? (
          <>
            {unitAmenities.length ? <Chips items={unitAmenities} /> : null}
            {propertyAmenities.length ? (
              <>
                <h3
                  className={cn(
                    "mb-3 font-display text-xl text-pine",
                    unitAmenities.length ? "mt-8" : "mt-0",
                  )}
                >
                  Around {propertyName}
                </h3>
                <Chips items={propertyAmenities} />
              </>
            ) : null}
          </>
        ) : (
          <Chips items={preview} />
        )}
      </div>
      {collapsible ? (
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls={panelId}
          className="mt-6 inline-flex h-11 items-center gap-2 rounded-lg border border-pine/25 px-5 font-medium text-pine transition-colors hover:border-pine/50 hover:bg-pine-mist/60"
        >
          {open ? "Show fewer" : `Show all ${total} amenities`}
          <CaretDown
            className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
            aria-hidden
          />
        </button>
      ) : null}
    </div>
  );
}
