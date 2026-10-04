ALTER TABLE "user" ADD COLUMN "is_demo_account" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
-- Preserve the existing shared demo account during the rollout. New demo
-- accounts are marked by scripts/seed.ts rather than by this legacy identity.
UPDATE "user" SET "is_demo_account" = true WHERE "email" = 'owner@hostayo.dev';
