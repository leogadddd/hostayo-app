ALTER TABLE "organizations" ADD COLUMN "public_page_live" boolean DEFAULT false NOT NULL;--> statement-breakpoint
-- Existing hosts already have a public page in use; only new organizations start offline.
UPDATE "organizations" SET "public_page_live" = true;
