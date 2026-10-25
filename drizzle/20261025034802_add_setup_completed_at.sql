ALTER TABLE "organizations" ADD COLUMN "setup_completed_at" timestamp with time zone;--> statement-breakpoint
-- Hosts that are live with a finished setup don't need the checklist again.
UPDATE "organizations" SET "setup_completed_at" = now() WHERE "public_page_live" = true;
