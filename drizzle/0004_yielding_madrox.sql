CREATE TABLE "equipment_bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"shoot_id" uuid NOT NULL,
	"equipment_item_id" uuid NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "equipment_bookings_positive_quantity" CHECK ("equipment_bookings"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "shoot_crew_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"shoot_id" uuid NOT NULL,
	"crew_member_id" uuid NOT NULL,
	"role" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "equipment_bookings" ADD CONSTRAINT "equipment_bookings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_bookings" ADD CONSTRAINT "equipment_bookings_shoot_id_shoots_id_fk" FOREIGN KEY ("shoot_id") REFERENCES "public"."shoots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_bookings" ADD CONSTRAINT "equipment_bookings_equipment_item_id_equipment_items_id_fk" FOREIGN KEY ("equipment_item_id") REFERENCES "public"."equipment_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shoot_crew_assignments" ADD CONSTRAINT "shoot_crew_assignments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shoot_crew_assignments" ADD CONSTRAINT "shoot_crew_assignments_shoot_id_shoots_id_fk" FOREIGN KEY ("shoot_id") REFERENCES "public"."shoots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shoot_crew_assignments" ADD CONSTRAINT "shoot_crew_assignments_crew_member_id_crew_members_id_fk" FOREIGN KEY ("crew_member_id") REFERENCES "public"."crew_members"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "equipment_bookings_shoot_equipment_uidx" ON "equipment_bookings" USING btree ("shoot_id","equipment_item_id");--> statement-breakpoint
CREATE INDEX "equipment_bookings_org_equipment_idx" ON "equipment_bookings" USING btree ("organization_id","equipment_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "shoot_crew_assignments_shoot_crew_uidx" ON "shoot_crew_assignments" USING btree ("shoot_id","crew_member_id");--> statement-breakpoint
CREATE INDEX "shoot_crew_assignments_org_crew_idx" ON "shoot_crew_assignments" USING btree ("organization_id","crew_member_id");