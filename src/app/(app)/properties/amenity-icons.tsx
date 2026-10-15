import {
  Wheelchair as Accessibility,
  Fan as AirVent,
  ArrowsDownUp as ArrowUpDown,
  Baby,
  Bathtub as Bath,
  Bed as BedDouble,
  Buildings as Building2,
  SecurityCamera as Cctv,
  Car as CircleParking,
  Coffee,
  CookingPot,
  Drop as Droplets,
  Barbell as Dumbbell,
  GridFour as Fence,
  Drop as GlassWater,
  Laptop,
  type PhosphorIcon,
  Oven as Microwave,
  MonitorPlay,
  Confetti as PartyPopper,
  PawPrint,
  Snowflake as Refrigerator,
  TShirt as Shirt,
  ShieldCheck,
  Shower as ShowerHead,
  BowlFood as Soup,
  Sparkle as Sparkles,
  Storefront as Store,
  Tree as Trees,
  Television as Tv,
  Umbrella,
  ForkKnife as Utensils,
  WashingMachine,
  Waves,
  WifiHigh as Wifi,
  Wind,
  Lightning as Zap,
} from "@/components/ui/icons";

/** Icon keys stored on default amenities (see src/lib/amenities.ts). */
const AMENITY_ICONS: Record<string, PhosphorIcon> = {
  pool: Waves,
  parking: CircleParking,
  gym: Dumbbell,
  elevator: ArrowUpDown,
  security: ShieldCheck,
  cctv: Cctv,
  garden: Trees,
  playground: Baby,
  laundry: WashingMachine,
  "function-room": PartyPopper,
  rooftop: Building2,
  pets: PawPrint,
  beach: Umbrella,
  store: Store,
  accessible: Accessibility,
  generator: Zap,
  wifi: Wifi,
  aircon: AirVent,
  kitchen: CookingPot,
  fridge: Refrigerator,
  microwave: Microwave,
  "rice-cooker": Soup,
  coffee: Coffee,
  dining: Utensils,
  towels: Bath,
  toiletries: Droplets,
  shower: ShowerHead,
  "hair-dryer": Wind,
  linens: BedDouble,
  tv: Tv,
  streaming: MonitorPlay,
  iron: Shirt,
  workspace: Laptop,
  balcony: Fence,
  water: GlassWater,
};

/** Custom amenities have no icon and fall back to a generic one. */
export function amenityIcon(key: string | null): PhosphorIcon {
  return (key && AMENITY_ICONS[key]) || Sparkles;
}

/** Read-only chips for detail pages. */
export function AmenityList({
  amenities,
  emptyLabel,
}: {
  amenities: { id: string; name: string; icon: string | null }[];
  emptyLabel: string;
}) {
  if (!amenities.length)
    return <p className="text-sm text-ink/55">{emptyLabel}</p>;
  return (
    <ul className="flex flex-wrap gap-2">
      {amenities.map((amenity) => {
        const Icon = amenityIcon(amenity.icon);
        return (
          <li
            key={amenity.id}
            className="inline-flex items-center gap-1.5 rounded-full border border-pine/15 bg-surface px-3 py-1 text-sm text-pine"
          >
            <Icon aria-hidden className="h-3.5 w-3.5 text-pine/60" />
            {amenity.name}
          </li>
        );
      })}
    </ul>
  );
}
