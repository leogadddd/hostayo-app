import { beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { inventoryPhotos, properties, units } from "@/lib/db/schema";
import { MAX_PHOTOS_PER_SECTION } from "@/lib/photo-sections";
import {
  addGalleryPhoto,
  clearGalleryCover,
  deleteGalleryPhoto,
  deleteGalleryPhotos,
  getPhotoStorageKey,
  listGalleryPhotos,
  moveGalleryPhoto,
  setGalleryCover,
  updateGalleryPhotoCaption,
} from "@/server/inventory/gallery";
import { InventoryError } from "@/server/inventory/validation";
import { createActiveUnit, createTestOrg, createTestProperty } from "./helpers";

// Object storage is out of scope here: keys are made up and nothing is stored.
const discarded: string[] = [];
vi.mock("@/server/inventory/photos", () => ({
  storeInventoryPhoto: async (organizationId: string) =>
    `org/${organizationId}/photos/${randomUUID()}`,
  discardInventoryPhoto: async (_org: string, key: string) => {
    discarded.push(key);
  },
}));

const UPLOAD = {
  contentType: "image/webp",
  body: new Uint8Array([1, 2, 3, 4]),
  width: 1600,
  height: 1067,
};

beforeEach(() => {
  discarded.length = 0;
});

async function setup(label: string) {
  const { org, owner } = await createTestOrg(label);
  const property = await createTestProperty(org.id, owner.id);
  const unit = await createActiveUnit(org.id, owner.id, property.id);
  const unitOwner = {
    organizationId: org.id,
    propertyId: property.id,
    unitId: unit.id,
    actorUserId: owner.id,
  };
  return { org, owner, property, unit, unitOwner };
}

describe("inventory photo gallery", () => {
  it("records metadata, makes the first photo the cover and mirrors it onto the unit", async () => {
    const { unit, unitOwner } = await setup("gallery-first");
    const first = await addGalleryPhoto({
      ...unitOwner,
      section: "bedroom",
      upload: UPLOAD,
      originalFilename: "bed.jpg",
      originalByteSize: 2048,
    });
    const second = await addGalleryPhoto({
      ...unitOwner,
      section: "view",
      upload: UPLOAD,
    });
    expect(first.isCover).toBe(true);
    expect(second.isCover).toBe(false);

    const [row] = await db
      .select()
      .from(inventoryPhotos)
      .where(eq(inventoryPhotos.id, first.id));
    expect(row).toMatchObject({
      section: "bedroom",
      byteSize: 4,
      width: 1600,
      height: 1067,
      originalFilename: "bed.jpg",
      originalByteSize: 2048,
      uploadedBy: unitOwner.actorUserId,
    });
    const [updated] = await db.select().from(units).where(eq(units.id, unit.id));
    expect(updated!.imageUrl).toBe(row!.storageKey);
  });

  it("rejects a section that doesn't belong to the record and caps photos per section", async () => {
    const { unitOwner, property, org, owner } = await setup("gallery-sections");
    await expect(
      addGalleryPhoto({ ...unitOwner, section: "nearby", upload: UPLOAD }),
    ).rejects.toBeInstanceOf(InventoryError);
    await expect(
      addGalleryPhoto({
        organizationId: org.id,
        propertyId: property.id,
        actorUserId: owner.id,
        section: "bedroom",
        upload: UPLOAD,
      }),
    ).rejects.toBeInstanceOf(InventoryError);

    for (let i = 0; i < MAX_PHOTOS_PER_SECTION; i++) {
      await addGalleryPhoto({ ...unitOwner, section: "bathroom", upload: UPLOAD });
    }
    await expect(
      addGalleryPhoto({ ...unitOwner, section: "bathroom", upload: UPLOAD }),
    ).rejects.toThrow(/up to/);
    // Only the over-limit upload had stored a file; it is cleaned up.
    expect(discarded).toHaveLength(1);
  });

  it("changes the cover, and promotes the next photo when the cover is deleted", async () => {
    const { unit, unitOwner } = await setup("gallery-cover");
    const a = await addGalleryPhoto({ ...unitOwner, section: "bedroom", upload: UPLOAD });
    const b = await addGalleryPhoto({ ...unitOwner, section: "bedroom", upload: UPLOAD });
    await setGalleryCover(unitOwner, b.id);
    let photos = await listGalleryPhotos(unitOwner);
    expect(photos.find((p) => p.isCover)?.id).toBe(b.id);

    await deleteGalleryPhoto(unitOwner, b.id);
    photos = await listGalleryPhotos(unitOwner);
    expect(photos.map((p) => p.id)).toEqual([a.id]);
    expect(photos[0]!.isCover).toBe(true);
    const [row] = await db.select().from(units).where(eq(units.id, unit.id));
    const key = await getPhotoStorageKey(unitOwner.organizationId, a.id);
    expect(row!.imageUrl).toBe(key);

    await deleteGalleryPhoto(unitOwner, a.id);
    const [cleared] = await db.select().from(units).where(eq(units.id, unit.id));
    expect(cleared!.imageUrl).toBeNull();
    expect(await listGalleryPhotos(unitOwner)).toEqual([]);
  });

  it("deletes several photos at once and moves the cover to what's left", async () => {
    const { unit, unitOwner } = await setup("gallery-bulk-delete");
    const a = await addGalleryPhoto({ ...unitOwner, section: "bedroom", upload: UPLOAD });
    const b = await addGalleryPhoto({ ...unitOwner, section: "bedroom", upload: UPLOAD });
    const c = await addGalleryPhoto({ ...unitOwner, section: "view", upload: UPLOAD });
    await deleteGalleryPhotos(unitOwner, [a.id, b.id]);
    const left = await listGalleryPhotos(unitOwner);
    expect(left.map((p) => p.id)).toEqual([c.id]);
    expect(left[0]!.isCover).toBe(true);
    const [row] = await db.select().from(units).where(eq(units.id, unit.id));
    expect(row!.imageUrl).toBe(await getPhotoStorageKey(unitOwner.organizationId, c.id));
    expect(discarded).toHaveLength(2);
    await expect(deleteGalleryPhotos(unitOwner, [])).rejects.toBeInstanceOf(InventoryError);
    // One unknown id fails the whole request and deletes nothing.
    await expect(
      deleteGalleryPhotos(unitOwner, [c.id, randomUUID()]),
    ).rejects.toBeInstanceOf(InventoryError);
    expect(await listGalleryPhotos(unitOwner)).toHaveLength(1);
  });

  it("removes the cover and clears it from the unit", async () => {
    const { unit, unitOwner } = await setup("gallery-clear-cover");
    await addGalleryPhoto({ ...unitOwner, section: "bedroom", upload: UPLOAD });
    await clearGalleryCover(unitOwner);
    expect((await listGalleryPhotos(unitOwner)).some((p) => p.isCover)).toBe(false);
    const [row] = await db.select().from(units).where(eq(units.id, unit.id));
    expect(row!.imageUrl).toBeNull();
    // Clearing again is a no-op.
    await expect(clearGalleryCover(unitOwner)).resolves.toBeUndefined();
  });

  it("reorders within a section and edits captions", async () => {
    const { unitOwner } = await setup("gallery-order");
    const a = await addGalleryPhoto({ ...unitOwner, section: "view", upload: UPLOAD });
    const b = await addGalleryPhoto({ ...unitOwner, section: "view", upload: UPLOAD });
    const c = await addGalleryPhoto({ ...unitOwner, section: "view", upload: UPLOAD });
    await moveGalleryPhoto(unitOwner, c.id, "earlier");
    expect((await listGalleryPhotos(unitOwner)).map((p) => p.id)).toEqual([a.id, c.id, b.id]);
    // Moving the first earlier is a no-op.
    await moveGalleryPhoto(unitOwner, a.id, "earlier");
    expect((await listGalleryPhotos(unitOwner)).map((p) => p.id)).toEqual([a.id, c.id, b.id]);

    await updateGalleryPhotoCaption(unitOwner, a.id, "  Sunset  ");
    expect((await listGalleryPhotos(unitOwner))[0]!.caption).toBe("Sunset");
    await updateGalleryPhotoCaption(unitOwner, a.id, "");
    expect((await listGalleryPhotos(unitOwner))[0]!.caption).toBeNull();
    await expect(
      updateGalleryPhotoCaption(unitOwner, a.id, "x".repeat(161)),
    ).rejects.toBeInstanceOf(InventoryError);
  });

  it("keeps property photos apart from unit photos and mirrors the property cover", async () => {
    const { org, owner, property, unitOwner } = await setup("gallery-property");
    const propertyOwner = {
      organizationId: org.id,
      propertyId: property.id,
      actorUserId: owner.id,
    };
    const outside = await addGalleryPhoto({ ...propertyOwner, section: "exterior", upload: UPLOAD });
    await addGalleryPhoto({ ...unitOwner, section: "bedroom", upload: UPLOAD });
    expect((await listGalleryPhotos(propertyOwner)).map((p) => p.id)).toEqual([outside.id]);
    expect(await listGalleryPhotos(unitOwner)).toHaveLength(1);
    const [row] = await db.select().from(properties).where(eq(properties.id, property.id));
    expect(row!.imageUrl).toBe(await getPhotoStorageKey(org.id, outside.id));
  });

  it("never exposes another organization's photos", async () => {
    const a = await setup("gallery-iso-a");
    const b = await setup("gallery-iso-b");
    const photo = await addGalleryPhoto({ ...a.unitOwner, section: "bedroom", upload: UPLOAD });
    expect(await getPhotoStorageKey(b.org.id, photo.id)).toBeNull();
    // A forged owner (B's org, A's unit) can't see, add to, or delete A's photos.
    const forged = { ...a.unitOwner, organizationId: b.org.id };
    await expect(listGalleryPhotos(forged)).resolves.toEqual([]);
    await expect(
      addGalleryPhoto({ ...forged, section: "bedroom", upload: UPLOAD }),
    ).rejects.toBeInstanceOf(InventoryError);
    await expect(deleteGalleryPhoto(forged, photo.id)).rejects.toBeInstanceOf(InventoryError);
  });
});
