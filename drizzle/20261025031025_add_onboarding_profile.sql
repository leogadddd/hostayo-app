ALTER TABLE "organizations" ADD COLUMN "onboarding_profile" jsonb;--> statement-breakpoint
-- Organizations that exist already skip the new onboarding questions.
UPDATE "organizations" SET "onboarding_profile" = '{}'::jsonb;
