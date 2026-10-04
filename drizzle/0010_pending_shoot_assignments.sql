CREATE TABLE IF NOT EXISTS "pending_shoot_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"shoot_id" uuid NOT NULL,
	"email" text NOT NULL,
	"role" text DEFAULT 'MEMBER' NOT NULL,
	"assigned_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pending_shoot_assignments"
	ADD CONSTRAINT "pending_shoot_assignments_organization_id_organizations_id_fk"
	FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id")
	ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pending_shoot_assignments"
	ADD CONSTRAINT "pending_shoot_assignments_shoot_id_shoots_id_fk"
	FOREIGN KEY ("shoot_id") REFERENCES "public"."shoots"("id")
	ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pending_shoot_assignments"
	ADD CONSTRAINT "pending_shoot_assignments_assigned_by_users_id_fk"
	FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id")
	ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "pending_shoot_assignments_shoot_email_uidx"
	ON "pending_shoot_assignments" USING btree ("shoot_id","email");
--> statement-breakpoint
CREATE INDEX "pending_shoot_assignments_org_email_idx"
	ON "pending_shoot_assignments" USING btree ("organization_id","email");
--> statement-breakpoint
CREATE INDEX "pending_shoot_assignments_shoot_idx"
	ON "pending_shoot_assignments" USING btree ("shoot_id");
