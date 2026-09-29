CREATE TABLE "shoot_checklist_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"shoot_id" uuid NOT NULL,
	"title" text NOT NULL,
	"is_completed" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"assigned_crew_member_id" uuid,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "shoot_checklist_items" ADD CONSTRAINT "shoot_checklist_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shoot_checklist_items" ADD CONSTRAINT "shoot_checklist_items_shoot_id_shoots_id_fk" FOREIGN KEY ("shoot_id") REFERENCES "public"."shoots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shoot_checklist_items" ADD CONSTRAINT "shoot_checklist_items_assigned_crew_member_id_crew_members_id_fk" FOREIGN KEY ("assigned_crew_member_id") REFERENCES "public"."crew_members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "shoot_checklist_items_shoot_sort_idx" ON "shoot_checklist_items" USING btree ("shoot_id","sort_order");--> statement-breakpoint
CREATE INDEX "shoot_checklist_items_organization_id_idx" ON "shoot_checklist_items" USING btree ("organization_id");