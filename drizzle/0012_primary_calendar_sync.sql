ALTER TABLE "shoots" ALTER COLUMN "sync_policy" SET DEFAULT 'google';

ALTER TABLE "google_calendar_connections" ADD COLUMN IF NOT EXISTS "user_id" uuid;
ALTER TABLE "google_calendar_connections" ADD COLUMN IF NOT EXISTS "target_calendar_id" text;
ALTER TABLE "google_calendar_connections" ADD COLUMN IF NOT EXISTS "source_calendar_ids" text;

DO $$ BEGIN
 ALTER TABLE "google_calendar_connections" ADD CONSTRAINT "google_calendar_connections_user_id_users_id_fk"
 FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

WITH single_member_orgs AS (
  SELECT organization_id, MIN(user_id::text)::uuid AS user_id
  FROM organization_memberships
  GROUP BY organization_id
  HAVING COUNT(DISTINCT user_id) = 1
)
UPDATE google_calendar_connections gcc
SET user_id = smo.user_id
FROM single_member_orgs smo
WHERE gcc.organization_id = smo.organization_id AND gcc.user_id IS NULL;

UPDATE google_calendar_connections
SET calendar_id = 'primary', target_calendar_id = 'primary', source_calendar_ids = '["primary"]',
    sync_enabled = true, sync_from_google = true, sync_to_google = true, updated_at = now()
WHERE user_id IS NOT NULL;

DROP INDEX IF EXISTS "google_calendar_connections_org_cal_uidx";
CREATE INDEX IF NOT EXISTS "google_calendar_connections_user_id_idx" ON "google_calendar_connections" USING btree ("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "google_calendar_connections_org_user_cal_uidx"
  ON "google_calendar_connections" USING btree ("organization_id", "user_id", "calendar_id") WHERE "user_id" IS NOT NULL;

ALTER TABLE "shoot_calendar_sync" ADD COLUMN IF NOT EXISTS "user_id" uuid;
ALTER TABLE "shoot_calendar_sync" ADD COLUMN IF NOT EXISTS "external_event_updated_at" timestamp with time zone;

DO $$ BEGIN
 ALTER TABLE "shoot_calendar_sync" ADD CONSTRAINT "shoot_calendar_sync_user_id_users_id_fk"
 FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

UPDATE shoot_calendar_sync scs
SET user_id = s.created_by
FROM shoots s
WHERE scs.shoot_id = s.id AND scs.organization_id = s.organization_id
  AND scs.user_id IS NULL AND s.created_by IS NOT NULL;

UPDATE shoot_calendar_sync SET external_calendar_id = 'primary', updated_at = now() WHERE user_id IS NOT NULL;

DROP INDEX IF EXISTS "shoot_calendar_sync_org_shoot_provider_uidx";
DROP INDEX IF EXISTS "shoot_calendar_sync_org_provider_event_uidx";
CREATE INDEX IF NOT EXISTS "shoot_calendar_sync_user_id_idx" ON "shoot_calendar_sync" USING btree ("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "shoot_calendar_sync_org_user_shoot_provider_uidx"
  ON "shoot_calendar_sync" USING btree ("organization_id", "user_id", "shoot_id", "provider") WHERE "user_id" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "shoot_calendar_sync_org_user_provider_event_uidx"
  ON "shoot_calendar_sync" USING btree ("organization_id", "user_id", "provider", "external_event_id") WHERE "user_id" IS NOT NULL;

DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM shoot_calendar_sync WHERE user_id IS NULL) THEN
   ALTER TABLE "shoot_calendar_sync" ALTER COLUMN "user_id" SET NOT NULL;
 END IF;
END $$;

CREATE TABLE IF NOT EXISTS "excluded_google_calendar_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "public"."organizations"("id") ON DELETE cascade,
  "user_id" uuid NOT NULL REFERENCES "public"."users"("id") ON DELETE cascade,
  "calendar_id" text DEFAULT 'primary' NOT NULL,
  "external_event_id" text NOT NULL,
  "reason" text DEFAULT 'birthday' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "excluded_google_events_org_user_cal_event_uidx"
  ON "excluded_google_calendar_events" USING btree ("organization_id", "user_id", "calendar_id", "external_event_id");
CREATE INDEX IF NOT EXISTS "excluded_google_events_user_idx"
  ON "excluded_google_calendar_events" USING btree ("user_id");

-- Birthday cleanup is intentionally separate. Run scripts/cleanup-google-birthdays.mjs in dry-run first.
