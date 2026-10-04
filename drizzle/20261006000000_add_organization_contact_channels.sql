ALTER TABLE "organizations" ADD COLUMN "contact_channels" jsonb DEFAULT '[]'::jsonb NOT NULL;
