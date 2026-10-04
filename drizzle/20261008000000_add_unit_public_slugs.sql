ALTER TABLE "units" ADD COLUMN "public_slug" text;--> statement-breakpoint
UPDATE "units"
SET "public_slug" = concat(
  left(trim(both '-' from regexp_replace(lower("name"), '[^a-z0-9]+', '-', 'g')), 48),
  '-',
  left(replace("id"::text, '-', ''), 8)
)
WHERE "public_slug" IS NULL;--> statement-breakpoint
ALTER TABLE "units" ALTER COLUMN "public_slug" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "units_org_public_slug_unique" ON "units" USING btree ("organization_id", "public_slug");
