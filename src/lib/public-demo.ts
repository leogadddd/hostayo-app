/**
 * Placeholder data for the public host, unit and guest-stay pages. The shapes
 * mirror the organizations, properties, units, amenities and reservations
 * tables so a real loader can return the same objects. Contact channels use
 * the saved organization value; the remaining content is demo data for now.
 */

import { cache } from "react";
import { and, eq, isNull } from "drizzle-orm";
import type { ContactChannel } from "@/lib/contact-channels";
import { db } from "@/lib/db";
import { organizations, properties, units } from "@/lib/db/schema";
import { listPropertyAmenities, listUnitAmenities } from "@/server/inventory/amenities";
import { getOccupancySegments } from "@/server/inventory/availability";

export interface PublicAmenity {
  name: string;
  /** Key into the amenity icon map (see amenityIcon). */
  icon: string;
}

export interface PublicBookedRange {
  /** First night, YYYY-MM-DD. */
  checkIn: string;
  /** Checkout day, YYYY-MM-DD. The night before is the last one booked. */
  checkOut: string;
}

export interface PublicUnit {
  id: string;
  slug: string;
  name: string;
  propertyName: string;
  location: string;
  description: string;
  imageUrl: string | null;
  imageGallery: string[];
  capacity: number;
  bedrooms: number;
  bathrooms: number;
  nightlyRateCents: number;
  /** Weekday overrides, "5" is Friday. */
  dayRates: Record<string, number>;
  cleaningFeeCents: number | null;
  securityDepositCents: number | null;
  reservationFeeLabel: string | null;
  checkInTime: string;
  checkOutTime: string;
  unitAmenities: PublicAmenity[];
  propertyAmenities: PublicAmenity[];
  guestHouseRules: string[];
  wifiName: string | null;
  wifiPassword: string | null;
  arrivalNotes: string[];
  checkoutSteps: string[];
  areaTips: { title: string; detail: string }[];
  /** Null uses every host channel; [] intentionally offers no contact options. */
  contactChannelIds: string[] | null;
  booked: PublicBookedRange[];
}

export interface PublicHost {
  slug: string;
  displayName: string;
  tagline: string;
  about: string;
  logoUrl: string | null;
  location: string;
  /** Enabled channels in display order. */
  channels: ContactChannel[];
  hostingSince: string;
  publicListingEnabled: boolean;
  units: PublicUnit[];
}

export interface GuestStay {
  token: string;
  guestName: string;
  host: Pick<PublicHost, "displayName" | "channels">;
  unit: PublicUnit;
  address: string;
  mapUrl: string | null;
  checkInDate: string;
  checkOutDate: string;
  status: "confirmed" | "checked_in" | "checked_out";
}

function addDays(date: string, days: number) {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

export function todayISO() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
}

const PROPERTY_AMENITIES: PublicAmenity[] = [
  { name: "Swimming pool", icon: "pool" },
  { name: "Parking", icon: "parking" },
  { name: "24/7 security", icon: "security" },
  { name: "Beach access", icon: "beach" },
  { name: "Garden", icon: "garden" },
];

const UNIT_AMENITIES: PublicAmenity[] = [
  { name: "Wi-Fi", icon: "wifi" },
  { name: "Air conditioning", icon: "aircon" },
  { name: "Kitchen tools", icon: "kitchen" },
  { name: "Refrigerator", icon: "fridge" },
  { name: "Rice cooker", icon: "rice-cooker" },
  { name: "Coffee maker", icon: "coffee" },
  { name: "Towels", icon: "towels" },
  { name: "Toiletries", icon: "toiletries" },
  { name: "Smart TV", icon: "tv" },
  { name: "Hot shower", icon: "shower" },
];

const HOUSE_RULES = [
  "No smoking inside the unit.",
  "Quiet hours from 10:00 PM to 7:00 AM.",
  "No parties or events without asking us first.",
  "Please keep to the guest count in your booking.",
  "Switch off the aircon and lights when you leave.",
];

function demoUnits(today: string): PublicUnit[] {
  const base = {
    propertyName: "Casa Alon Beach Villas",
    location: "Corong-Corong, El Nido, Palawan",
    imageUrl: null,
    imageGallery: [],
    cleaningFeeCents: 80000,
    securityDepositCents: 200000,
    reservationFeeLabel: "30% reservation fee to hold your dates",
    checkInTime: "15:00",
    checkOutTime: "11:00",
    unitAmenities: UNIT_AMENITIES,
    propertyAmenities: PROPERTY_AMENITIES,
    guestHouseRules: HOUSE_RULES,
    wifiName: "CasaAlon-Guest",
    wifiPassword: "alon-garden-2026",
    arrivalNotes: [
      "Gate code is 4821. It is on the right side of the main gate.",
      "Garden Villa is the second building on the left past the pool.",
      "The key is in the lockbox by the door. Code 1957.",
      "Message us when you arrive and we will say hello.",
    ],
    checkoutSteps: [
      "Switch off the aircon, lights and fans.",
      "Put used towels in the bathroom basket.",
      "Throw rubbish in the bin by the gate.",
      "Lock the door and return the key to the lockbox.",
    ],
    areaTips: [
      { title: "Island hopping", detail: "Tours leave from the beach at 8:30 AM. Ask us to book one." },
      { title: "Dinner nearby", detail: "Three restaurants within a 5 minute walk, all along the beach road." },
      { title: "Groceries", detail: "The small market on the main road opens at 6:00 AM." },
    ],
    contactChannelIds: null,
  };
  return [
    {
      ...base,
      id: "u1",
      slug: "garden-villa",
      name: "Garden Villa",
      description:
        "A quiet villa tucked behind the garden, a short walk from the beach. Wake up to birdsong, cook in a full kitchen and spend the evenings on the private terrace. Good for families and small groups who want space to slow down.",
      capacity: 4,
      bedrooms: 2,
      bathrooms: 2,
      nightlyRateCents: 950000,
      dayRates: { "5": 1100000, "6": 1100000 },
      booked: [
        { checkIn: addDays(today, 3), checkOut: addDays(today, 6) },
        { checkIn: addDays(today, 10), checkOut: addDays(today, 12) },
        { checkIn: addDays(today, 18), checkOut: addDays(today, 23) },
        { checkIn: addDays(today, 36), checkOut: addDays(today, 39) },
      ],
    },
    {
      ...base,
      id: "u2",
      slug: "poolside-loft",
      name: "Poolside Loft",
      description:
        "A bright two-level loft steps from the pool. Three bedrooms, a big dining table and a living area that opens to the water, built for groups who like to be together.",
      capacity: 6,
      bedrooms: 3,
      bathrooms: 2,
      nightlyRateCents: 1250000,
      dayRates: { "5": 1450000, "6": 1450000 },
      booked: [
        { checkIn: today, checkOut: addDays(today, 2) },
        { checkIn: addDays(today, 7), checkOut: addDays(today, 11) },
        { checkIn: addDays(today, 24), checkOut: addDays(today, 28) },
      ],
    },
    {
      ...base,
      id: "u3",
      slug: "seaview-suite",
      name: "Seaview Suite",
      description:
        "A compact suite with the best view on the property. One bedroom, one bath and a balcony made for coffee at sunrise. A good fit for couples.",
      capacity: 2,
      bedrooms: 1,
      bathrooms: 1,
      nightlyRateCents: 650000,
      dayRates: { "5": 750000, "6": 750000 },
      booked: [
        { checkIn: addDays(today, 1), checkOut: addDays(today, 4) },
        { checkIn: addDays(today, 14), checkOut: addDays(today, 17) },
        { checkIn: addDays(today, 20), checkOut: addDays(today, 22) },
      ],
    },
  ];
}

export const getPublicHost = cache(async (slug: string): Promise<PublicHost | null> => {
  if (!slug) return null;
  const organization = await db.query.organizations.findFirst({
    columns: { id: true, name: true, displayName: true, logoUrl: true, tagline: true, contactChannels: true, publicListingEnabled: true, city: true, municipality: true, province: true, createdAt: true },
    where: eq(organizations.slug, slug),
  });
  if (!organization) return null;
  const rows = await db.select({ unit: units, property: properties }).from(units)
    .innerJoin(properties, and(eq(units.propertyId, properties.id), eq(units.organizationId, properties.organizationId)))
    .where(and(eq(units.organizationId, organization.id), eq(units.status, "active"), isNull(units.deletedAt), isNull(properties.deletedAt)))
    .orderBy(units.name);
  const today = todayISO();
  const bookedByUnit = await getOccupancySegments(organization.id, rows.map((row) => row.unit.id), today, addDays(today, 366));
  const mappedUnits = await Promise.all(rows.map(async ({ unit, property }) => {
    const [unitAmenities, propertyAmenities] = await Promise.all([
      listUnitAmenities(organization.id, unit.id),
      listPropertyAmenities(organization.id, property.id),
    ]);
    return {
      id: unit.id,
      slug: unit.publicSlug,
      name: unit.name,
      propertyName: property.name,
      location: [organization.city ?? organization.municipality, organization.province].filter(Boolean).join(", ") || "Philippines",
      description: unit.description ?? "",
      imageUrl: unit.imageUrl,
      imageGallery: unit.imageGallery,
      capacity: unit.capacity,
      bedrooms: unit.bedrooms,
      bathrooms: unit.bathrooms,
      nightlyRateCents: unit.defaultNightlyRateCents,
      dayRates: unit.dayRates,
      cleaningFeeCents: unit.cleaningFeeCents,
      securityDepositCents: unit.securityDepositCents,
      reservationFeeLabel: null,
      checkInTime: unit.checkInTime,
      checkOutTime: unit.checkOutTime,
      unitAmenities: unitAmenities.map((amenity) => ({ name: amenity.name, icon: amenity.icon ?? "" })),
      propertyAmenities: propertyAmenities.map((amenity) => ({ name: amenity.name, icon: amenity.icon ?? "" })),
      guestHouseRules: unit.guestHouseRules,
      wifiName: unit.wifiName,
      wifiPassword: unit.wifiPassword,
      arrivalNotes: unit.arrivalNotes,
      checkoutSteps: unit.checkoutSteps,
      areaTips: unit.areaTips,
      contactChannelIds: unit.contactChannelIds,
      booked: (bookedByUnit.get(unit.id) ?? []).map((segment) => ({ checkIn: segment.startDate, checkOut: segment.endDate })),
    } satisfies PublicUnit;
  }));
  return {
    slug,
    displayName: organization.displayName ?? organization.name,
    tagline: organization.tagline ?? "",
    about: "",
    logoUrl: organization.logoUrl,
    location: [organization.city ?? organization.municipality, organization.province].filter(Boolean).join(", ") || "Philippines",
    channels: organization.contactChannels,
    hostingSince: String(organization.createdAt.getUTCFullYear()),
    publicListingEnabled: organization.publicListingEnabled,
    units: mappedUnits,
  };
});

export async function getPublicUnit(hostSlug: string, unitSlug: string) {
  const host = await getPublicHost(hostSlug);
  const unit = host?.units.find((candidate) => candidate.slug === unitSlug) ?? null;
  return host && unit ? { host, unit } : null;
}

export async function getGuestStay(token: string): Promise<GuestStay | null> {
  // The demo has one explicit link. Keeping this check here prevents arbitrary
  // URLs from looking like valid stays while the production loader is swapped
  // in for access-token queries.
  if (token !== "demo-stay") return null;
  const host = await getPublicHost("casa-alon");
  const unit = host?.units[0];
  if (!host || !unit) return null;
  const today = todayISO();
  return {
    token,
    guestName: "Bea Garcia",
    host,
    unit,
    address: "Corong-Corong Road, El Nido, Palawan",
    mapUrl: "https://maps.google.com",
    checkInDate: addDays(today, -1),
    checkOutDate: addDays(today, 2),
    status: "checked_in",
  };
}
