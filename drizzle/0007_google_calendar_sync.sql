CREATE TABLE "google_calendar_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"calendar_id" text DEFAULT 'primary' NOT NULL,
	"calendar_name" text,
	"account_email" text,
	"account_name" text,
	"access_token" text,
	"refresh_token" text,
	"expires_at" timestamp with time zone,
	"token_type" text DEFAULT 'Bearer',
	"scope" text,
	"sync_enabled" boolean DEFAULT true NOT NULL,
	"sync_shoots" boolean DEFAULT true NOT NULL,
	"sync_meetings" boolean DEFAULT true NOT NULL,
	"sync_location_scout" boolean DEFAULT true NOT NULL,
	"sync_internal_events" boolean DEFAULT true NOT NULL,
	"sync_from_google" boolean DEFAULT true NOT NULL,
	"sync_to_google" boolean DEFAULT true NOT NULL,
	"next_sync_token" text,
	"last_synced_at" timestamp with time zone,
	"last_sync_status" text DEFAULT 'idle' NOT NULL,
	"last_sync_message" text,
	"last_error_at" timestamp with time zone,
	"status" text DEFAULT 'connected' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shoot_calendar_sync" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"shoot_id" uuid NOT NULL,
	"provider" text DEFAULT 'google' NOT NULL,
	"external_calendar_id" text DEFAULT 'primary' NOT NULL,
	"external_event_id" text NOT NULL,
	"external_event_etag" text,
	"external_ical_uid" text,
	"last_synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_sync_hash" text,
	"sync_status" text DEFAULT 'synced' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "google_calendar_connections" ADD CONSTRAINT "google_calendar_connections_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shoot_calendar_sync" ADD CONSTRAINT "shoot_calendar_sync_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shoot_calendar_sync" ADD CONSTRAINT "shoot_calendar_sync_shoot_id_shoots_id_fk" FOREIGN KEY ("shoot_id") REFERENCES "public"."shoots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "google_calendar_connections_org_idx" ON "google_calendar_connections" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "google_calendar_connections_org_cal_uidx" ON "google_calendar_connections" USING btree ("organization_id","calendar_id");--> statement-breakpoint
CREATE UNIQUE INDEX "shoot_calendar_sync_org_shoot_provider_uidx" ON "shoot_calendar_sync" USING btree ("organization_id","shoot_id","provider");--> statement-breakpoint
CREATE UNIQUE INDEX "shoot_calendar_sync_org_provider_event_uidx" ON "shoot_calendar_sync" USING btree ("organization_id","provider","external_event_id");--> statement-breakpoint
CREATE INDEX "shoot_calendar_sync_shoot_idx" ON "shoot_calendar_sync" USING btree ("shoot_id");
