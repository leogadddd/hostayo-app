import "server-only";

import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  auditEvents,
  inventoryPhotos,
  properties,
  units,
  type InventoryPhoto,
} from "@/lib/db/schema";
import {
  galleryPhotoSrc,
  isPhotoSection,
  MAX_PHOTOS_PER_SECTION,
  PHOTO_SECTION_LABELS,
  PHOTO_SECTIONS_BY_SCOPE,
  type GalleryPhoto,
  type PhotoSection,
} from "@/lib/photo-sections";
import { InventoryError } from "./validation";
import { getPropertyOrThrow, getUnitOrThrow } from "./service";
import { discardInventoryPhoto, storeInventoryPhoto } from "./photos";
import type { ImageUpload } from "./image-upload";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** The record a gallery belongs to: a property's own photos, or one unit's. */
export interface GalleryOwner {
  organizationId: string;
  propertyId: string;
  /** Omit for the property's own photos. */
  unitId?: string | null;
}

const ownerCondition = (owner: GalleryOwner) =>
  and(
    eq(inventoryPhotos.organizationId, owner.organizationId),
    eq(inventoryPhotos.propertyId, owner.propertyId),
    owner.unitId
      ? eq(inventoryPhotos.unitId, owner.unitId)
      : isNull(inventoryPhotos.unitId),
    isNull(inventoryPhotos.deletedAt),
  );

function toGalleryPhoto(row: InventoryPhoto): GalleryPhoto {
  return {
    id: row.id,
    section: row.section,
    src: galleryPhotoSrc(row.id, row.updatedAt),
    caption: row.caption,
    isCover: row.isCover,
    width: row.width,
    height: row.height,
  };
}

/** Confirm the owner exists in this organization, so a forged id can't reach another's photos. */
async function assertOwner(owner: GalleryOwner) {
  await getPropertyOrThrow(owner.organizationId, owner.propertyId);
  if (owner.unitId) {
    const unit = await getUnitOrThrow(owner.organizationId, owner.unitId);
    if (unit.propertyId !== owner.propertyId) {
      throw new InventoryError("Unit not found.");
    }
  }
}

export async function listGalleryPhotos(
  owner: GalleryOwner,
): Promise<GalleryPhoto[]> {
  const rows = await db
    .select()
    .from(inventoryPhotos)
    .where(ownerCondition(owner))
    .orderBy(asc(inventoryPhotos.position), asc(inventoryPhotos.createdAt));
  return rows.map(toGalleryPhoto);
}

/** Keep `image_url` on the property or unit pointing at the cover photo. */
async function syncCover(tx: Tx, owner: GalleryOwner) {
  const [cover] = await tx
    .select({ storageKey: inventoryPhotos.storageKey })
    .from(inventoryPhotos)
    .where(and(ownerCondition(owner), eq(inventoryPhotos.isCover, true)))
    .limit(1);
  const imageUrl = cover?.storageKey ?? null;
  if (owner.unitId) {
    await tx
      .update(units)
      .set({ imageUrl, updatedAt: new Date() })
      .where(
        and(
          eq(units.id, owner.unitId),
          eq(units.organizationId, owner.organizationId),
        ),
      );
  } else {
    await tx
      .update(properties)
      .set({ imageUrl, updatedAt: new Date() })
      .where(
        and(
          eq(properties.id, owner.propertyId),
          eq(properties.organizationId, owner.organizationId),
        ),
      );
  }
}

export interface AddPhotoInput extends GalleryOwner {
  actorUserId: string;
  section: string;
  upload: ImageUpload;
  originalFilename?: string | null;
  originalByteSize?: number | null;
}

/** Store one photo and record it under a section. The first photo becomes the cover. */
export async function addGalleryPhoto(
  input: AddPhotoInput,
): Promise<GalleryPhoto> {
  const scope = input.unitId ? "unit" : "property";
  if (
    !isPhotoSection(input.section) ||
    !PHOTO_SECTIONS_BY_SCOPE[scope].includes(input.section)
  ) {
    throw new InventoryError("Choose a section for this photo.", "section");
  }
  const section: PhotoSection = input.section;
  await assertOwner(input);

  const key = await storeInventoryPhoto(input.organizationId, input.upload);
  try {
    return await db.transaction(async (tx) => {
      const existing = await tx
        .select({
          section: inventoryPhotos.section,
          position: inventoryPhotos.position,
          isCover: inventoryPhotos.isCover,
        })
        .from(inventoryPhotos)
        .where(ownerCondition(input));
      const inSection = existing.filter((photo) => photo.section === section);
      if (inSection.length >= MAX_PHOTOS_PER_SECTION) {
        throw new InventoryError(
          `${PHOTO_SECTION_LABELS[section]} can hold up to ${MAX_PHOTOS_PER_SECTION} photos.`,
          "section",
        );
      }
      const [row] = await tx
        .insert(inventoryPhotos)
        .values({
          organizationId: input.organizationId,
          propertyId: input.propertyId,
          unitId: input.unitId ?? null,
          section,
          storageKey: key,
          contentType: input.upload.contentType,
          byteSize: input.upload.body.byteLength,
          width: input.upload.width ?? null,
          height: input.upload.height ?? null,
          originalFilename: input.originalFilename?.slice(0, 200) || null,
          originalByteSize: input.originalByteSize ?? null,
          position: inSection.reduce((max, p) => Math.max(max, p.position + 1), 0),
          isCover: !existing.some((photo) => photo.isCover),
          uploadedBy: input.actorUserId,
        })
        .returning();
      if (!row) throw new InventoryError("Could not save the photo.");
      if (row.isCover) await syncCover(tx, input);
      await tx.insert(auditEvents).values({
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        entity: input.unitId ? "unit" : "property",
        entityId: input.unitId ?? input.propertyId,
        action: "photo.added",
        metadata: { photoId: row.id, section },
      });
      return toGalleryPhoto(row);
    });
  } catch (error) {
    await discardInventoryPhoto(input.organizationId, key);
    throw error;
  }
}

async function getPhotoOrThrow(
  owner: GalleryOwner,
  photoId: string,
): Promise<InventoryPhoto> {
  const [row] = await db
    .select()
    .from(inventoryPhotos)
    .where(and(ownerCondition(owner), eq(inventoryPhotos.id, photoId)))
    .limit(1);
  if (!row) throw new InventoryError("Photo not found.");
  return row;
}

/** Delete a photo. If it was the cover, the next photo takes over. */
export async function deleteGalleryPhoto(
  owner: GalleryOwner & { actorUserId: string },
  photoId: string,
) {
  await deleteGalleryPhotos(owner, [photoId]);
}

/** Delete several photos at once. If the cover is among them, the next photo takes over. */
export async function deleteGalleryPhotos(
  owner: GalleryOwner & { actorUserId: string },
  photoIds: readonly string[],
) {
  const ids = [...new Set(photoIds)];
  if (!ids.length) throw new InventoryError("Choose photos to delete.");
  const photos = await db
    .select()
    .from(inventoryPhotos)
    .where(and(ownerCondition(owner), inArray(inventoryPhotos.id, ids)));
  if (photos.length !== ids.length) {
    throw new InventoryError("Photo not found.");
  }
  await db.transaction(async (tx) => {
    await tx
      .update(inventoryPhotos)
      .set({ deletedAt: new Date(), isCover: false, updatedAt: new Date() })
      .where(inArray(inventoryPhotos.id, ids));
    if (photos.some((photo) => photo.isCover)) {
      const [next] = await tx
        .select({ id: inventoryPhotos.id })
        .from(inventoryPhotos)
        .where(ownerCondition(owner))
        .orderBy(asc(inventoryPhotos.createdAt))
        .limit(1);
      if (next) {
        await tx
          .update(inventoryPhotos)
          .set({ isCover: true, updatedAt: new Date() })
          .where(eq(inventoryPhotos.id, next.id));
      }
    }
    await syncCover(tx, owner);
    await tx.insert(auditEvents).values({
      organizationId: owner.organizationId,
      actorUserId: owner.actorUserId,
      entity: owner.unitId ? "unit" : "property",
      entityId: owner.unitId ?? owner.propertyId,
      action: "photo.deleted",
      metadata: {
        photoIds: ids,
        count: ids.length,
        sections: [...new Set(photos.map((photo) => photo.section))],
      },
    });
  });
  for (const photo of photos) {
    await discardInventoryPhoto(owner.organizationId, photo.storageKey);
  }
}

/** Make one photo the cover shown on cards and lists. */
export async function setGalleryCover(
  owner: GalleryOwner & { actorUserId: string },
  photoId: string,
) {
  const photo = await getPhotoOrThrow(owner, photoId);
  if (photo.isCover) return;
  await db.transaction(async (tx) => {
    // Clear first: the partial unique index allows only one live cover.
    await tx
      .update(inventoryPhotos)
      .set({ isCover: false, updatedAt: new Date() })
      .where(and(ownerCondition(owner), eq(inventoryPhotos.isCover, true)));
    await tx
      .update(inventoryPhotos)
      .set({ isCover: true, updatedAt: new Date() })
      .where(eq(inventoryPhotos.id, photo.id));
    await syncCover(tx, owner);
    await tx.insert(auditEvents).values({
      organizationId: owner.organizationId,
      actorUserId: owner.actorUserId,
      entity: owner.unitId ? "unit" : "property",
      entityId: owner.unitId ?? owner.propertyId,
      action: "photo.cover_set",
      metadata: { photoId: photo.id },
    });
  });
}

/** Remove the cover, so cards and lists show no photo until another is chosen. */
export async function clearGalleryCover(
  owner: GalleryOwner & { actorUserId: string },
) {
  await db.transaction(async (tx) => {
    const cleared = await tx
      .update(inventoryPhotos)
      .set({ isCover: false, updatedAt: new Date() })
      .where(and(ownerCondition(owner), eq(inventoryPhotos.isCover, true)))
      .returning({ id: inventoryPhotos.id });
    if (!cleared.length) return;
    await syncCover(tx, owner);
    await tx.insert(auditEvents).values({
      organizationId: owner.organizationId,
      actorUserId: owner.actorUserId,
      entity: owner.unitId ? "unit" : "property",
      entityId: owner.unitId ?? owner.propertyId,
      action: "photo.cover_cleared",
      metadata: { photoId: cleared[0]!.id },
    });
  });
}

export async function updateGalleryPhotoCaption(
  owner: GalleryOwner,
  photoId: string,
  caption: string,
) {
  const photo = await getPhotoOrThrow(owner, photoId);
  const trimmed = caption.trim();
  if (trimmed.length > 160) {
    throw new InventoryError("Captions can be up to 160 characters.", "caption");
  }
  await db
    .update(inventoryPhotos)
    .set({ caption: trimmed || null, updatedAt: new Date() })
    .where(eq(inventoryPhotos.id, photo.id));
}

/** Move a photo one place earlier or later within its section. */
export async function moveGalleryPhoto(
  owner: GalleryOwner,
  photoId: string,
  direction: "earlier" | "later",
) {
  const photo = await getPhotoOrThrow(owner, photoId);
  await db.transaction(async (tx) => {
    const siblings = await tx
      .select({ id: inventoryPhotos.id })
      .from(inventoryPhotos)
      .where(and(ownerCondition(owner), eq(inventoryPhotos.section, photo.section)))
      .orderBy(asc(inventoryPhotos.position), asc(inventoryPhotos.createdAt));
    const ids = siblings.map((row) => row.id);
    const index = ids.indexOf(photo.id);
    const target = direction === "earlier" ? index - 1 : index + 1;
    if (index < 0 || target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target]!, ids[index]!];
    for (const [position, id] of ids.entries()) {
      await tx
        .update(inventoryPhotos)
        .set({ position, updatedAt: sql`now()` })
        .where(eq(inventoryPhotos.id, id));
    }
  });
}

/** The photo's storage key, for serving it, if it belongs to this organization. */
export async function getPhotoStorageKey(
  organizationId: string,
  photoId: string,
): Promise<string | null> {
  const [row] = await db
    .select({ storageKey: inventoryPhotos.storageKey })
    .from(inventoryPhotos)
    .where(
      and(
        eq(inventoryPhotos.id, photoId),
        eq(inventoryPhotos.organizationId, organizationId),
        isNull(inventoryPhotos.deletedAt),
      ),
    )
    .limit(1);
  return row?.storageKey ?? null;
}
