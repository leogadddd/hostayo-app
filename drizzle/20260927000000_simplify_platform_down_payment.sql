-- Preserve every platform's existing reservation-fee behavior while giving
-- the setting a direct, user-facing meaning.
ALTER TABLE "booking_platforms" ADD COLUMN "down_payment_applies" boolean DEFAULT true NOT NULL;--> statement-breakpoint
UPDATE "booking_platforms" SET "down_payment_applies" = NOT "collects_payment";--> statement-breakpoint
ALTER TABLE "booking_platforms" DROP CONSTRAINT "booking_platforms_commission_check";--> statement-breakpoint
ALTER TABLE "booking_platforms" DROP COLUMN "commission_basis_points";--> statement-breakpoint
ALTER TABLE "booking_platforms" DROP COLUMN "collects_payment";
