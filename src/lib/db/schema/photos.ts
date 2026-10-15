import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { organizations } from "./orgs";
import { properties, units } from "./inventory";
import { PHOTO_SECTIONS } from "@/lib/photo-sections";

export const photoSection = pgEnum("photo_section", PHOTO_SECTIONS);

/**
 * One uploaded photo of a property (`unitId` null) or of one of its units,
 * filed under a section such as "bedroom" or "view". The image itself lives in
 * object storage under `storageKey`; this row is its metadata.
 *
 * `isCover` marks the photo shown on cards and lists. At most one photo per
 * property or unit is the cover, and its key is mirrored into
 * `properties.image_url` / `units.image_url` so existing screens keep working.
 */
export const inventoryPhotos = pgTable(
  "inventory_photos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    propertyId: uuid("property_id").notNull(),
    // Null for a photo of the property itself.
    unitId: uuid("unit_id"),
    section: photoSection("section").notNull(),
    storageKey: text("storage_key").notNull(),
    // Facts about the stored (normalized) image.
    contentType: text("content_type").notNull().default("image/webp"),
    byteSize: integer("byte_size").notNull(),
    width: integer("width"),
    height: integer("height"),
    // Facts about the upload, for the team's reference.
    originalFilename: text("original_filename"),
    originalByteSize: integer("original_byte_size"),
    caption: text("caption"),
    // Order within its section; lower comes first.
    position: integer("position").notNull().default(0),
    isCover: boolean("is_cover").notNull().default(false),
    uploadedBy: text("uploaded_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("inventory_photos_storage_key_unique").on(table.storageKey),
    index("inventory_photos_property_idx").on(
      table.organizationId,
      table.propertyId,
      table.section,
      table.position,
    ),
    index("inventory_photos_unit_idx").on(table.unitId, table.section, table.position),
    // One live cover per unit, and one per property for its own photos.
    uniqueIndex("inventory_photos_unit_cover_unique")
      .on(table.unitId)
      .where(sql`${table.isCover} AND ${table.unitId} IS NOT NULL AND ${table.deletedAt} IS NULL`),
    uniqueIndex("inventory_photos_property_cover_unique")
      .on(table.propertyId)
      .where(sql`${table.isCover} AND ${table.unitId} IS NULL AND ${table.deletedAt} IS NULL`),
    foreignKey({
      name: "inventory_photos_property_fk",
      columns: [table.organizationId, table.propertyId],
      foreignColumns: [properties.organizationId, properties.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "inventory_photos_unit_fk",
      columns: [table.organizationId, table.unitId],
      foreignColumns: [units.organizationId, units.id],
    }).onDelete("cascade"),
    check(
      "inventory_photos_sizes_check",
      sql`${table.byteSize} >= 0 AND (${table.width} IS NULL OR ${table.width} > 0) AND (${table.height} IS NULL OR ${table.height} > 0)`,
    ),
  ],
);

export type InventoryPhoto = typeof inventoryPhotos.$inferSelect;
