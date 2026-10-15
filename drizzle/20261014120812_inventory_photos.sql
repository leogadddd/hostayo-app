CREATE TYPE "public"."photo_section" AS ENUM('exterior', 'living_room', 'bedroom', 'bathroom', 'view', 'nearby', 'additional');--> statement-breakpoint
CREATE TABLE "inventory_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"property_id" uuid NOT NULL,
	"unit_id" uuid,
	"section" "photo_section" NOT NULL,
	"storage_key" text NOT NULL,
	"content_type" text DEFAULT 'image/webp' NOT NULL,
	"byte_size" integer NOT NULL,
	"width" integer,
	"height" integer,
	"original_filename" text,
	"original_byte_size" integer,
	"caption" text,
	"position" integer DEFAULT 0 NOT NULL,
	"is_cover" boolean DEFAULT false NOT NULL,
	"uploaded_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "inventory_photos_sizes_check" CHECK ("inventory_photos"."byte_size" >= 0 AND ("inventory_photos"."width" IS NULL OR "inventory_photos"."width" > 0) AND ("inventory_photos"."height" IS NULL OR "inventory_photos"."height" > 0))
);
--> statement-breakpoint
ALTER TABLE "inventory_photos" ADD CONSTRAINT "inventory_photos_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_photos" ADD CONSTRAINT "inventory_photos_uploaded_by_user_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_photos" ADD CONSTRAINT "inventory_photos_property_fk" FOREIGN KEY ("organization_id","property_id") REFERENCES "public"."properties"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_photos" ADD CONSTRAINT "inventory_photos_unit_fk" FOREIGN KEY ("organization_id","unit_id") REFERENCES "public"."units"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_photos_storage_key_unique" ON "inventory_photos" USING btree ("storage_key");--> statement-breakpoint
CREATE INDEX "inventory_photos_property_idx" ON "inventory_photos" USING btree ("organization_id","property_id","section","position");--> statement-breakpoint
CREATE INDEX "inventory_photos_unit_idx" ON "inventory_photos" USING btree ("unit_id","section","position");--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_photos_unit_cover_unique" ON "inventory_photos" USING btree ("unit_id") WHERE "inventory_photos"."is_cover" AND "inventory_photos"."unit_id" IS NOT NULL AND "inventory_photos"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_photos_property_cover_unique" ON "inventory_photos" USING btree ("property_id") WHERE "inventory_photos"."is_cover" AND "inventory_photos"."unit_id" IS NULL AND "inventory_photos"."deleted_at" IS NULL;--> statement-breakpoint
-- Bring each existing stored cover photo into the gallery, as that record's cover.
INSERT INTO "inventory_photos" ("organization_id", "property_id", "unit_id", "section", "storage_key", "byte_size", "is_cover")
SELECT "organization_id", "id", NULL, 'exterior', "image_url", 0, true
FROM "properties"
WHERE "image_url" LIKE 'org/%' AND "deleted_at" IS NULL;--> statement-breakpoint
INSERT INTO "inventory_photos" ("organization_id", "property_id", "unit_id", "section", "storage_key", "byte_size", "is_cover")
SELECT "organization_id", "property_id", "id", 'additional', "image_url", 0, true
FROM "units"
WHERE "image_url" LIKE 'org/%' AND "deleted_at" IS NULL;
