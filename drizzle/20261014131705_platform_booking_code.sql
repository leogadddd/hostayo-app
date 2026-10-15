ALTER TABLE "booking_platforms" ADD COLUMN "has_booking_code" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
-- These sources don't issue a confirmation code, so stop asking for one.
UPDATE "booking_platforms"
SET "has_booking_code" = false
WHERE "key" IN ('direct', 'walk_in', 'referral', 'facebook', 'messenger', 'instagram');
