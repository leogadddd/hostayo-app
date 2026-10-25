ALTER TABLE "organizations" ADD COLUMN "about_text" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "cancellation_policy" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "min_stay_nights" integer DEFAULT 1 NOT NULL;