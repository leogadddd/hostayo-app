CREATE TABLE "pricing_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"priority" integer DEFAULT 100 NOT NULL,
	"stacks" boolean DEFAULT false NOT NULL,
	"start_date" text,
	"end_date" text,
	"repeats_yearly" boolean DEFAULT false NOT NULL,
	"weekdays" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"adjustment_type" text NOT NULL,
	"adjustment_value" integer NOT NULL,
	"applies_to_all" boolean DEFAULT true NOT NULL,
	"property_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"unit_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pricing_rules_name_length" CHECK (char_length(trim("pricing_rules"."name")) BETWEEN 2 AND 80),
	CONSTRAINT "pricing_rules_adjustment_check" CHECK ("pricing_rules"."adjustment_type" IN ('percent', 'amount', 'fixed')
        AND ("pricing_rules"."adjustment_type" <> 'fixed' OR "pricing_rules"."adjustment_value" >= 0)),
	CONSTRAINT "pricing_rules_dates_check" CHECK ("pricing_rules"."start_date" IS NULL OR "pricing_rules"."end_date" IS NULL OR "pricing_rules"."start_date" <= "pricing_rules"."end_date"
        OR "pricing_rules"."repeats_yearly")
);
--> statement-breakpoint
ALTER TABLE "pricing_rules" ADD CONSTRAINT "pricing_rules_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pricing_rules_org_idx" ON "pricing_rules" USING btree ("organization_id","is_active");