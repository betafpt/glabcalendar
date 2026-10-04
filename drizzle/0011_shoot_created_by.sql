ALTER TABLE "shoots" ADD COLUMN IF NOT EXISTS "created_by" uuid;

DO $$ BEGIN
 ALTER TABLE "shoots" ADD CONSTRAINT "shoots_created_by_users_id_fk"
 FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "shoots_created_by_idx" ON "shoots" USING btree ("created_by");
