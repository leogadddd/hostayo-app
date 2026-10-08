CREATE TYPE "public"."recurring_cadence" AS ENUM('weekly', 'monthly', 'yearly');--> statement-breakpoint
CREATE TABLE "recurring_expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"property_id" uuid NOT NULL,
	"unit_id" uuid,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"classification" "expense_classification" DEFAULT 'operating' NOT NULL,
	"payee" text,
	"payment_method" "payment_method",
	"amount_cents" integer NOT NULL,
	"cadence" "recurring_cadence" NOT NULL,
	"anchor_date" date NOT NULL,
	"next_due_date" date NOT NULL,
	"end_date" date,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recurring_expenses_amount_positive" CHECK ("recurring_expenses"."amount_cents" > 0)
);
--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "recurring_expense_id" uuid;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "recurring_due_date" date;--> statement-breakpoint
ALTER TABLE "recurring_expenses" ADD CONSTRAINT "recurring_expenses_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_expenses" ADD CONSTRAINT "recurring_expenses_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_expenses" ADD CONSTRAINT "recurring_expenses_organization_id_property_id_properties_organization_id_id_fk" FOREIGN KEY ("organization_id","property_id") REFERENCES "public"."properties"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_expenses" ADD CONSTRAINT "recurring_expenses_organization_id_unit_id_units_organization_id_id_fk" FOREIGN KEY ("organization_id","unit_id") REFERENCES "public"."units"("organization_id","id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "recurring_expenses_organization_id_unique" ON "recurring_expenses" USING btree ("organization_id","id");--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_organization_id_recurring_expense_id_recurring_expenses_organization_id_id_fk" FOREIGN KEY ("organization_id","recurring_expense_id") REFERENCES "public"."recurring_expenses"("organization_id","id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "expenses_recurring_due_unique" ON "expenses" USING btree ("recurring_expense_id","recurring_due_date");