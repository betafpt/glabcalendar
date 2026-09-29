import { sql } from "drizzle-orm";
import {
  check,
  boolean,
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  timezone: text("timezone").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    clientName: text("client_name"),
    status: text("status").notNull().default("planned"),
    startsOn: date("starts_on", { mode: "string" }),
    endsOn: date("ends_on", { mode: "string" }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    organizationIdx: index("projects_organization_id_idx").on(
      table.organizationId
    ),
  })
);

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;

export const shoots = pgTable(
  "shoots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    status: text("status").notNull().default("planned"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    callTime: timestamp("call_time", { withTimezone: true }),
    locationName: text("location_name"),
    locationAddress: text("location_address"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    organizationStartsAtIdx: index("shoots_organization_starts_at_idx").on(
      table.organizationId,
      table.startsAt
    ),
    organizationProjectIdx: index("shoots_organization_project_id_idx").on(
      table.organizationId,
      table.projectId
    ),
    validInterval: check(
      "shoots_valid_interval",
      sql`${table.endsAt} > ${table.startsAt}`
    ),
  })
);

export type Shoot = typeof shoots.$inferSelect;
export type NewShoot = typeof shoots.$inferInsert;

export const crewMembers = pgTable(
  "crew_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    defaultRole: text("default_role"),
    phone: text("phone"),
    email: text("email"),
    status: text("status").notNull().default("active"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    organizationIdx: index("crew_members_organization_id_idx").on(table.organizationId),
    validStatus: check("crew_members_valid_status", sql`${table.status} in ('active', 'inactive')`),
  })
);

export type CrewMember = typeof crewMembers.$inferSelect;
export type NewCrewMember = typeof crewMembers.$inferInsert;

export const equipmentItems = pgTable(
  "equipment_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    category: text("category"),
    assetCode: text("asset_code"),
    serialNumber: text("serial_number"),
    status: text("status").notNull().default("available"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    organizationIdx: index("equipment_items_organization_id_idx").on(table.organizationId),
    organizationAssetCodeUnique: uniqueIndex("equipment_items_org_asset_code_uidx").on(table.organizationId, table.assetCode),
    validStatus: check("equipment_items_valid_status", sql`${table.status} in ('available', 'maintenance', 'retired')`),
  })
);

export type EquipmentItem = typeof equipmentItems.$inferSelect;
export type NewEquipmentItem = typeof equipmentItems.$inferInsert;

export const shootCrewAssignments = pgTable(
  "shoot_crew_assignments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    shootId: uuid("shoot_id").notNull().references(() => shoots.id, { onDelete: "cascade" }),
    crewMemberId: uuid("crew_member_id").notNull().references(() => crewMembers.id, { onDelete: "restrict" }),
    role: text("role"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    shootCrewUnique: uniqueIndex("shoot_crew_assignments_shoot_crew_uidx").on(table.shootId, table.crewMemberId),
    organizationCrewIdx: index("shoot_crew_assignments_org_crew_idx").on(table.organizationId, table.crewMemberId),
  })
);

export type ShootCrewAssignment = typeof shootCrewAssignments.$inferSelect;
export type NewShootCrewAssignment = typeof shootCrewAssignments.$inferInsert;

export const equipmentBookings = pgTable(
  "equipment_bookings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    shootId: uuid("shoot_id").notNull().references(() => shoots.id, { onDelete: "cascade" }),
    equipmentItemId: uuid("equipment_item_id").notNull().references(() => equipmentItems.id, { onDelete: "restrict" }),
    quantity: integer("quantity").notNull().default(1),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    shootEquipmentUnique: uniqueIndex("equipment_bookings_shoot_equipment_uidx").on(table.shootId, table.equipmentItemId),
    organizationEquipmentIdx: index("equipment_bookings_org_equipment_idx").on(table.organizationId, table.equipmentItemId),
    positiveQuantity: check("equipment_bookings_positive_quantity", sql`${table.quantity} > 0`),
  })
);

export type EquipmentBooking = typeof equipmentBookings.$inferSelect;
export type NewEquipmentBooking = typeof equipmentBookings.$inferInsert;

export const shootChecklistItems = pgTable(
  "shoot_checklist_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    shootId: uuid("shoot_id").notNull().references(() => shoots.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    isCompleted: boolean("is_completed").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    assignedCrewMemberId: uuid("assigned_crew_member_id").references(() => crewMembers.id, { onDelete: "set null" }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    shootSortIdx: index("shoot_checklist_items_shoot_sort_idx").on(table.shootId, table.sortOrder),
    organizationIdx: index("shoot_checklist_items_organization_id_idx").on(table.organizationId),
  })
);

export type ShootChecklistItem = typeof shootChecklistItems.$inferSelect;
export type NewShootChecklistItem = typeof shootChecklistItems.$inferInsert;
