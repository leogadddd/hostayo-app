/**
 * The parts of a place that photos are grouped under. A property and a unit
 * each offer the sections that make sense for them; nobody has to fill every
 * section.
 */
export const PHOTO_SECTIONS = [
  "exterior",
  "living_room",
  "bedroom",
  "bathroom",
  "view",
  "nearby",
  "additional",
] as const;

export type PhotoSection = (typeof PHOTO_SECTIONS)[number];

export const PHOTO_SECTION_LABELS: Record<PhotoSection, string> = {
  exterior: "Exterior",
  living_room: "Living room",
  bedroom: "Bedroom",
  bathroom: "Bathroom",
  view: "View",
  nearby: "Nearby",
  additional: "Additional photos",
};

export const PHOTO_SECTION_HINTS: Record<PhotoSection, string> = {
  exterior: "The building, entrance and grounds.",
  living_room: "Living and dining areas.",
  bedroom: "Beds, wardrobes and sleeping areas.",
  bathroom: "Showers, vanities and toilets.",
  view: "What guests see from the windows or balcony.",
  nearby: "Shops, food, transport and places to visit.",
  additional: "Kitchen, amenities and anything else.",
};

export type PhotoScope = "property" | "unit";

/** Sections offered for each kind of record, in display order. */
export const PHOTO_SECTIONS_BY_SCOPE: Record<
  PhotoScope,
  readonly PhotoSection[]
> = {
  property: ["exterior", "view", "nearby", "additional"],
  unit: ["living_room", "bedroom", "bathroom", "view", "additional"],
};

export const MAX_PHOTOS_PER_SECTION = 12;

export function isPhotoSection(value: unknown): value is PhotoSection {
  return (
    typeof value === "string" &&
    (PHOTO_SECTIONS as readonly string[]).includes(value)
  );
}

/** A photo as the UI sees it: a browser-ready src, never the storage key. */
export interface GalleryPhoto {
  id: string;
  section: PhotoSection;
  src: string;
  caption: string | null;
  isCover: boolean;
  width: number | null;
  height: number | null;
}

/** Where a stored photo is served from. The version busts the cache on change. */
export function galleryPhotoSrc(id: string, updatedAt: Date | string): string {
  const version = new Date(updatedAt).getTime();
  return `/api/photos/${id}?v=${version}`;
}

/** Where a photo on a public page is served from; no sign-in needed. */
export function publicPhotoSrc(id: string, updatedAt: Date | string): string {
  const version = new Date(updatedAt).getTime();
  return `/api/public/photos/${id}?v=${version}`;
}
