import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { inventoryPhotos, units } from "@/lib/db/schema";
import {
  getPublicPhotoKey,
  listPublicUnitPhotos,
} from "@/server/inventory/public-photos";
import { createActiveUnit, createTestOrg, createTestProperty } from "./helpers";

async function addPhoto(input: {
  organizationId: string;
  propertyId: string;
  unitId: string | null;
  isCover?: boolean;
  deleted?: boolean;
}) {
  const [row] = await db
    .insert(inventoryPhotos)
    .values({
      organizationId: input.organizationId,
      propertyId: input.propertyId,
      unitId: input.unitId,
      section: input.unitId ? "bedroom" : "exterior",
      storageKey: `org/${input.organizationId}/photos/${crypto.randomUUID()}`,
      byteSize: 1000,
      isCover: input.isCover ?? false,
      deletedAt: input.deleted ? new Date() : null,
    })
    .returning();
  return row!;
}

describe("public photos", () => {
  it("serves photos of active units and their property, and nothing else", async () => {
    const { org, owner } = await createTestOrg("public-photos");
    const property = await createTestProperty(org.id, owner.id, "Hillside");
    const unit = await createActiveUnit(org.id, owner.id, property.id, "Loft");
    const unitPhoto = await addPhoto({
      organizationId: org.id,
      propertyId: property.id,
      unitId: unit.id,
      isCover: true,
    });
    const propertyPhoto = await addPhoto({
      organizationId: org.id,
      propertyId: property.id,
      unitId: null,
    });
    const deleted = await addPhoto({
      organizationId: org.id,
      propertyId: property.id,
      unitId: unit.id,
      deleted: true,
    });

    expect(await getPublicPhotoKey(unitPhoto.id)).toMatchObject({
      organizationId: org.id,
      storageKey: unitPhoto.storageKey,
    });
    expect(await getPublicPhotoKey(propertyPhoto.id)).not.toBeNull();
    expect(await getPublicPhotoKey(deleted.id)).toBeNull();
    expect(await getPublicPhotoKey(crypto.randomUUID())).toBeNull();

    // Once the unit is taken off the public page its photos go with it.
    await db
      .update(units)
      .set({ status: "renovating" })
      .where(eq(units.id, unit.id));
    expect(await getPublicPhotoKey(unitPhoto.id)).toBeNull();
    expect(await getPublicPhotoKey(propertyPhoto.id)).toBeNull();
  });

  it("picks the unit's cover, falls back to the property's, and lists the rest", async () => {
    const { org, owner } = await createTestOrg("public-covers");
    const property = await createTestProperty(org.id, owner.id, "Bayview");
    const withCover = await createActiveUnit(
      org.id,
      owner.id,
      property.id,
      "Unit A",
    );
    const bare = await createActiveUnit(
      org.id,
      owner.id,
      property.id,
      "Unit B",
    );
    const cover = await addPhoto({
      organizationId: org.id,
      propertyId: property.id,
      unitId: withCover.id,
      isCover: true,
    });
    const extra = await addPhoto({
      organizationId: org.id,
      propertyId: property.id,
      unitId: withCover.id,
    });
    const propertyCover = await addPhoto({
      organizationId: org.id,
      propertyId: property.id,
      unitId: null,
      isCover: true,
    });

    const photos = await listPublicUnitPhotos(org.id, [
      { unitId: withCover.id, propertyId: property.id },
      { unitId: bare.id, propertyId: property.id },
    ]);
    expect(photos.get(withCover.id)?.cover).toContain(cover.id);
    expect(photos.get(withCover.id)?.gallery).toHaveLength(1);
    expect(photos.get(withCover.id)?.gallery[0]).toContain(extra.id);
    expect(photos.get(bare.id)?.cover).toContain(propertyCover.id);
    expect(photos.get(bare.id)?.gallery).toEqual([]);
  });
});
