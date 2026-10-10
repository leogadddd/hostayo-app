CREATE TABLE "early_access_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"social" text NOT NULL,
	"units" text NOT NULL,
	"source" text NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "early_access_requests_created_idx" ON "early_access_requests" USING btree ("created_at");