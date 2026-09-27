CREATE TYPE "public"."profile_gender" AS ENUM('woman', 'man', 'non_binary', 'prefer_not_to_say', 'self_describe');--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "two_factor_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE TABLE "user_profiles" (
  "user_id" text PRIMARY KEY NOT NULL,
  "preferred_name" text,
  "phone" text,
  "gender" "profile_gender",
  "gender_description" text,
  "birthday" date,
  "address_line_1" text,
  "address_line_2" text,
  "barangay" text,
  "city_municipality" text,
  "province" text,
  "region" text,
  "postal_code" text,
  "country" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade;--> statement-breakpoint
CREATE TABLE "user_security_preferences" (
  "user_id" text PRIMARY KEY NOT NULL,
  "new_sign_in_alerts" boolean DEFAULT true NOT NULL,
  "two_factor_change_alerts" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "user_security_preferences" ADD CONSTRAINT "user_security_preferences_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade;--> statement-breakpoint
CREATE TABLE "twoFactor" (
  "id" text PRIMARY KEY NOT NULL,
  "secret" text NOT NULL,
  "backup_codes" text NOT NULL,
  "user_id" text NOT NULL,
  "verified" boolean DEFAULT false NOT NULL,
  "failed_verification_count" integer DEFAULT 0 NOT NULL,
  "locked_until" timestamp with time zone
);--> statement-breakpoint
ALTER TABLE "twoFactor" ADD CONSTRAINT "twoFactor_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "two_factor_user_id_unique" ON "twoFactor" USING btree ("user_id");
