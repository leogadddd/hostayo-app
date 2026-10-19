ALTER TABLE "early_access_requests" ADD COLUMN "accepted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "early_access_requests" ADD COLUMN "invite_id" uuid;--> statement-breakpoint
ALTER TABLE "early_access_requests" ADD COLUMN "welcome_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "early_access_requests" ADD CONSTRAINT "early_access_requests_invite_fk" FOREIGN KEY ("invite_id") REFERENCES "public"."registration_invites"("id") ON DELETE set null ON UPDATE no action;