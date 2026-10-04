ALTER TABLE "organizations" ADD COLUMN "tagline" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "public_listing_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "image_gallery" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "guest_house_rules" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "wifi_name" text;--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "wifi_password" text;--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "arrival_notes" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "area_tips" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "checkout_steps" jsonb DEFAULT '[]'::jsonb NOT NULL;
