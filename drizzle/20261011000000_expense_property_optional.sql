ALTER TABLE "expenses" ALTER COLUMN "property_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "recurring_expenses" ALTER COLUMN "property_id" DROP NOT NULL;