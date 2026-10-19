ALTER TABLE "user" ADD COLUMN "blocked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "blocked_reason" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "last_login_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "blocked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "early_access_requests" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "early_access_requests" ADD CONSTRAINT "early_access_requests_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
UPDATE "user" SET "last_login_at" = latest.at FROM (SELECT "user_id", max("created_at") AS at FROM "session" GROUP BY "user_id") AS latest WHERE latest."user_id" = "user"."id";--> statement-breakpoint
UPDATE "early_access_requests" SET "user_id" = found."id" FROM (SELECT DISTINCT ON (r."invite_id") r."invite_id", u."id" FROM "registration_invite_redemptions" r JOIN "user" u ON lower(u."email") = r."email" ORDER BY r."invite_id", r."redeemed_at") AS found WHERE found."invite_id" = "early_access_requests"."invite_id" AND "early_access_requests"."user_id" IS NULL;
