CREATE TABLE "registration_invite_redemptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invite_id" uuid NOT NULL,
	"email" text NOT NULL,
	"redeemed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "registration_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" text NOT NULL,
	"label" text,
	"max_uses" integer DEFAULT 1 NOT NULL,
	"use_count" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "registration_invites_token_hash_unique" UNIQUE("token_hash"),
	CONSTRAINT "registration_invites_uses_within_limit" CHECK ("registration_invites"."max_uses" >= 1 AND "registration_invites"."use_count" >= 0 AND "registration_invites"."use_count" <= "registration_invites"."max_uses")
);
--> statement-breakpoint
ALTER TABLE "registration_invite_redemptions" ADD CONSTRAINT "registration_invite_redemptions_invite_fk" FOREIGN KEY ("invite_id") REFERENCES "public"."registration_invites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "registration_invite_redemptions_invite_idx" ON "registration_invite_redemptions" USING btree ("invite_id");