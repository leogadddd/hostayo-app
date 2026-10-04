CREATE TYPE "public"."extension_status" AS ENUM('requested', 'approved', 'declined');--> statement-breakpoint
ALTER TABLE "reservation_extensions" ALTER COLUMN "charge_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "reservation_extensions" ADD COLUMN "status" "extension_status" DEFAULT 'requested' NOT NULL;--> statement-breakpoint
ALTER TABLE "reservation_extensions" ADD COLUMN "decided_by" text;--> statement-breakpoint
ALTER TABLE "reservation_extensions" ADD COLUMN "decided_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "reservation_extensions" ADD COLUMN "decision_note" text;--> statement-breakpoint
-- Extensions made before requests existed were applied straight away.
UPDATE "reservation_extensions" SET "status" = 'approved', "decided_by" = "created_by", "decided_at" = "created_at" WHERE "charge_id" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "reservation_extensions" ADD CONSTRAINT "reservation_extensions_decided_by_user_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "reservation_extensions_one_open_request" ON "reservation_extensions" USING btree ("reservation_id") WHERE "reservation_extensions"."status" = 'requested';--> statement-breakpoint
ALTER TABLE "reservation_extensions" ADD CONSTRAINT "reservation_extensions_charge_status_check" CHECK (("reservation_extensions"."status" = 'approved') = ("reservation_extensions"."charge_id" IS NOT NULL));