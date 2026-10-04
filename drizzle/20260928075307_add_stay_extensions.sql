ALTER TYPE "public"."charge_type" ADD VALUE 'extension';--> statement-breakpoint
CREATE TABLE "reservation_extensions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"reservation_id" uuid NOT NULL,
	"charge_id" uuid NOT NULL,
	"hours" integer NOT NULL,
	"hourly_rate_cents" integer NOT NULL,
	"note" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reservation_extensions_hours_check" CHECK ("reservation_extensions"."hours" BETWEEN 1 AND 24),
	CONSTRAINT "reservation_extensions_rate_check" CHECK ("reservation_extensions"."hourly_rate_cents" >= 0)
);
--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "extensions_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "max_extension_hours" integer DEFAULT 4 NOT NULL;--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "extension_hourly_rate_cents" integer;--> statement-breakpoint
ALTER TABLE "reservation_extensions" ADD CONSTRAINT "reservation_extensions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservation_extensions" ADD CONSTRAINT "reservation_extensions_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservation_extensions" ADD CONSTRAINT "reservation_extensions_organization_id_reservation_id_reservations_organization_id_id_fk" FOREIGN KEY ("organization_id","reservation_id") REFERENCES "public"."reservations"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservation_extensions" ADD CONSTRAINT "reservation_extensions_organization_id_charge_id_reservation_charges_organization_id_id_fk" FOREIGN KEY ("organization_id","charge_id") REFERENCES "public"."reservation_charges"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "reservation_extensions_reservation_idx" ON "reservation_extensions" USING btree ("organization_id","reservation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reservation_extensions_charge_unique" ON "reservation_extensions" USING btree ("charge_id");--> statement-breakpoint
ALTER TABLE "units" ADD CONSTRAINT "units_extension_check" CHECK ("units"."max_extension_hours" BETWEEN 1 AND 12
        AND ("units"."extension_hourly_rate_cents" IS NULL OR "units"."extension_hourly_rate_cents" >= 0));