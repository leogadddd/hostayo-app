CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
ALTER TABLE "guests" ADD COLUMN "phone_digits" text GENERATED ALWAYS AS (regexp_replace(coalesce(phone, ''), '\D', '', 'g')) STORED;--> statement-breakpoint
CREATE INDEX "properties_name_trgm_idx" ON "properties" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "units_name_trgm_idx" ON "units" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "guests_name_trgm_idx" ON "guests" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "guests_email_trgm_idx" ON "guests" USING gin ("email" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "guests_phone_digits_trgm_idx" ON "guests" USING gin ("phone_digits" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "reservations_org_check_in_idx" ON "reservations" USING btree ("organization_id","check_in_date");--> statement-breakpoint
CREATE INDEX "reservations_org_check_out_idx" ON "reservations" USING btree ("organization_id","check_out_date");--> statement-breakpoint
CREATE INDEX "reservations_platform_reference_trgm_idx" ON "reservations" USING gin ("platform_reference" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "expenses_description_trgm_idx" ON "expenses" USING gin ("description" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "expenses_payee_trgm_idx" ON "expenses" USING gin ("payee" gin_trgm_ops);