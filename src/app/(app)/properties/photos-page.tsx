"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { Buildings as Building2, Images } from "@/components/ui/icons";
import { buttonClassName } from "@/components/ui/button";
import type { GalleryPhoto, PhotoScope } from "@/lib/photo-sections";
import { UnitPhoto } from "../calendar/availability/stay-display";
import { FormLayout } from "./form-kit";
import type { GalleryTarget } from "./photo-actions";
import { PhotoSectionsCard } from "./photo-sections";

/**
 * The dedicated Photos page for a property or unit: sections on the left, as
 * panels like the Details form, and a sticky summary with the cover and the
 * way out on the right.
 */
export function PhotosPage({
  target,
  scope,
  initialPhotos,
  name,
  parentName,
  justCreated,
  doneHref,
}: {
  target: GalleryTarget;
  scope: PhotoScope;
  initialPhotos: GalleryPhoto[];
  name: string;
  /** The property a unit belongs to. */
  parentName?: string;
  justCreated: boolean;
  doneHref: string;
}) {
  const [photos, setPhotos] = useState(initialPhotos);
  const onPhotosChange = useCallback(
    (next: GalleryPhoto[]) => setPhotos(next),
    [],
  );
  const cover = photos.find((photo) => photo.isCover)?.src ?? null;
  const sectionsUsed = new Set(photos.map((photo) => photo.section)).size;
  const count = photos.length;

  return (
    <FormLayout
      aside={
        <div className="overflow-hidden rounded-2xl border border-pine/10 bg-surface shadow-[0_1px_2px_rgba(32,58,53,0.06)]">
          <UnitPhoto src={cover} className="aspect-[16/10]" />
          <div className="p-5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-pine-mist px-2.5 py-0.5 text-xs font-medium text-pine">
              {scope === "property" ? (
                <Building2 className="h-3.5 w-3.5" aria-hidden />
              ) : null}
              {scope === "property" ? "Property" : "Unit"}
            </span>
            <p className="mt-3 truncate font-display text-2xl text-pine">
              {name}
            </p>
            {parentName ? (
              <p className="mt-0.5 truncate text-sm text-ink/55">
                {parentName}
              </p>
            ) : null}
            <p className="mt-4 flex items-center gap-2 text-sm text-ink/65">
              <Images className="h-4 w-4 text-pine/40" aria-hidden />
              {count === 0
                ? "No photos yet"
                : `${count} ${count === 1 ? "photo" : "photos"} in ${sectionsUsed} ${sectionsUsed === 1 ? "section" : "sections"}`}
            </p>
            {count > 0 ? (
              <p className="mt-1 text-xs text-ink/50">
                The cover photo shows on cards and lists. Tap the star on any
                photo to set or remove it.
              </p>
            ) : null}
          </div>
          <div className="space-y-3 border-t border-pine/10 p-5">
            <Link
              href={doneHref}
              className={buttonClassName("clay", "lg", "w-full")}
            >
              {justCreated ? (count === 0 ? "Skip for now" : "Done") : "Done"}
            </Link>
            <p className="text-center text-xs text-ink/50">
              Photos save as soon as they upload.
            </p>
          </div>
        </div>
      }
    >
      <PhotoSectionsCard
        target={target}
        scope={scope}
        initialPhotos={initialPhotos}
        title={name}
        panels
        onPhotosChange={onPhotosChange}
      />
    </FormLayout>
  );
}
