CREATE TABLE "shoots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid,
	"title" text NOT NULL,
	"status" text DEFAULT 'planned' NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"call_time" timestamp with time zone,
	"location_name" text,
	"location_address" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shoots_valid_interval" CHECK ("shoots"."ends_at" > "shoots"."starts_at")
);
--> statement-breakpoint
ALTER TABLE "shoots" ADD CONSTRAINT "shoots_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shoots" ADD CONSTRAINT "shoots_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "shoots_organization_starts_at_idx" ON "shoots" USING btree ("organization_id","starts_at");--> statement-breakpoint
CREATE INDEX "shoots_organization_project_id_idx" ON "shoots" USING btree ("organization_id","project_id");