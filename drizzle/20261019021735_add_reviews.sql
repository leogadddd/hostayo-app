CREATE TABLE "review_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"reservation_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"created_by" text,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"unit_id" uuid NOT NULL,
	"reservation_id" uuid,
	"kind" text NOT NULL,
	"status" text NOT NULL,
	"rating" smallint NOT NULL,
	"category_scores" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"private_feedback" text,
	"guest_name" text NOT NULL,
	"stay_check_out_at" timestamp with time zone,
	"stay_nights" integer,
	"source" text,
	"payment_verified" boolean,
	"fingerprint_hash" text,
	"host_reply" text,
	"host_replied_at" timestamp with time zone,
	"host_replied_by" text,
	"moderated_by" text,
	"moderated_at" timestamp with time zone,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reviews_rating_check" CHECK ("reviews"."rating" BETWEEN 1 AND 5),
	CONSTRAINT "reviews_kind_check" CHECK ("reviews"."kind" IN ('verified', 'community')),
	CONSTRAINT "reviews_status_check" CHECK ("reviews"."status" IN ('pending', 'published', 'hidden')),
	CONSTRAINT "reviews_verified_has_stay_check" CHECK ("reviews"."kind" <> 'verified' OR "reviews"."reservation_id" IS NOT NULL),
	CONSTRAINT "reviews_guest_name_length" CHECK (char_length(trim("reviews"."guest_name")) BETWEEN 1 AND 60),
	CONSTRAINT "reviews_body_length" CHECK (char_length("reviews"."body") <= 2000)
);
--> statement-breakpoint
ALTER TABLE "review_links" ADD CONSTRAINT "review_links_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_links" ADD CONSTRAINT "review_links_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_links" ADD CONSTRAINT "review_links_organization_id_reservation_id_reservations_organization_id_id_fk" FOREIGN KEY ("organization_id","reservation_id") REFERENCES "public"."reservations"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_host_replied_by_user_id_fk" FOREIGN KEY ("host_replied_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_moderated_by_user_id_fk" FOREIGN KEY ("moderated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_organization_id_unit_id_units_organization_id_id_fk" FOREIGN KEY ("organization_id","unit_id") REFERENCES "public"."units"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_organization_id_reservation_id_reservations_organization_id_id_fk" FOREIGN KEY ("organization_id","reservation_id") REFERENCES "public"."reservations"("organization_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "review_links_token_hash_unique" ON "review_links" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "review_links_reservation_idx" ON "review_links" USING btree ("organization_id","reservation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reviews_organization_id_unique" ON "reviews" USING btree ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "reviews_reservation_unique" ON "reviews" USING btree ("reservation_id") WHERE "reviews"."reservation_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "reviews_unit_status_idx" ON "reviews" USING btree ("organization_id","unit_id","status");--> statement-breakpoint
CREATE INDEX "reviews_fingerprint_idx" ON "reviews" USING btree ("unit_id","fingerprint_hash","submitted_at");