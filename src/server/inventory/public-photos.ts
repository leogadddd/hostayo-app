import "server-only";

import { and, asc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { inventoryPhotos, properties, units } from "@/lib/db/schema";
import { publicPhotoSrc } from "@/lib/photo-sections";

/**
 * The stored key of a photo that a public page may show: a live photo of an
 * active unit, or of a property that has an active unit. Anything else,
 * including deleted photos and units still being set up, is not public.
 */
export async function getPublicPhotoKey(photoId: string) {
  const [row] = await db
    .select({
      organizationId: inventoryPhotos.organizationId,
      storageKey: inventoryPhotos.storageKey,
    })
    .from(inventoryPhotos)
    .innerJoin(
      properties,
      and(
        eq(properties.organizationId, inventoryPhotos.organizationId),
        eq(properties.id, inventoryPhotos.propertyId),
      ),
    )
    .leftJoin(
      units,
      and(
        eq(units.organizationId, inventoryPhotos.organizationId),
        eq(units.id, inventoryPhotos.unitId),
      ),
    )
    .where(
      and(
        eq(inventoryPhotos.id, photoId),
        isNull(inventoryPhotos.deletedAt),
        isNull(properties.deletedAt),
        or(
          and(eq(units.status, "active"), isNull(units.deletedAt)),
          and(
            isNull(inventoryPhotos.unitId),
            sql`exists (
              select 1 from ${units} as active_unit
              where active_unit.property_id = ${properties.id}
                and active_unit.organization_id = ${properties.organizationId}
                and active_unit.status = 'active'
                and active_unit.deleted_at is null
            )`,
          ),
        ),
      ),
    )
    .limit(1);
  return row ?? null;
}

export interface PublicUnitPhotos {
  /** The unit's cover, else its property's cover, else its first photo. */
  cover: string | null;
  /** The unit's other photos, in the order the team arranged them. */
  gallery: string[];
}

/** Public photo URLs for several units at once, keyed by unit id. */
export async function listPublicUnitPhotos(
  organizationId: string,
  unitProperties: { unitId: string; propertyId: string }[],
): Promise<Map<string, PublicUnitPhotos>> {
  const result = new Map<string, PublicUnitPhotos>();
  if (!unitProperties.length) return result;
  const unitIds = unitProperties.map((entry) => entry.unitId);
  const propertyIds = [...new Set(unitProperties.map((e) => e.propertyId))];
  const rows = await db
    .select({
      id: inventoryPhotos.id,
      unitId: inventoryPhotos.unitId,
      propertyId: inventoryPhotos.propertyId,
      isCover: inventoryPhotos.isCover,
      updatedAt: inventoryPhotos.updatedAt,
    })
    .from(inventoryPhotos)
    .where(
      and(
        eq(inventoryPhotos.organizationId, organizationId),
        isNull(inventoryPhotos.deletedAt),
        or(
          inArray(inventoryPhotos.unitId, unitIds),
          and(
            isNull(inventoryPhotos.unitId),
            inArray(inventoryPhotos.propertyId, propertyIds),
          ),
        ),
      ),
    )
    .orderBy(asc(inventoryPhotos.position), asc(inventoryPhotos.createdAt));
  for (const { unitId, propertyId } of unitProperties) {
    const own = rows.filter((row) => row.unitId === unitId);
    const propertyCover = rows.find(
      (row) =>
        row.unitId === null && row.propertyId === propertyId && row.isCover,
    );
    const cover = own.find((row) => row.isCover) ?? propertyCover ?? own[0];
    result.set(unitId, {
      cover: cover ? publicPhotoSrc(cover.id, cover.updatedAt) : null,
      gallery: own
        .filter((row) => row.id !== cover?.id)
        .map((row) => publicPhotoSrc(row.id, row.updatedAt)),
    });
  }
  return result;
}

/** Public URLs of each property's own cover photo, keyed by property id. */
export async function listPublicPropertyCovers(
  organizationId: string,
  propertyIds: string[],
): Promise<Map<string, string>> {
  const covers = new Map<string, string>();
  if (!propertyIds.length) return covers;
  const rows = await db
    .select({
      id: inventoryPhotos.id,
      propertyId: inventoryPhotos.propertyId,
      updatedAt: inventoryPhotos.updatedAt,
    })
    .from(inventoryPhotos)
    .where(
      and(
        eq(inventoryPhotos.organizationId, organizationId),
        inArray(inventoryPhotos.propertyId, propertyIds),
        isNull(inventoryPhotos.unitId),
        eq(inventoryPhotos.isCover, true),
        isNull(inventoryPhotos.deletedAt),
      ),
    );
  for (const row of rows) {
    covers.set(row.propertyId, publicPhotoSrc(row.id, row.updatedAt));
  }
  return covers;
}
