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
import type { AdapterAccountType } from "next-auth/adapters";

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
    avatarDataUrl: text("avatar_data_url"),
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
    imageDataUrl: text("image_data_url"),
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

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { withTimezone: true, mode: "date" }),
  image: text("image"),
  role: text("role").default("user").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    compoundKey: uniqueIndex("accounts_provider_provider_account_id_uidx").on(
      table.provider,
      table.providerAccountId
    ),
    userIdIdx: index("accounts_user_id_idx").on(table.userId),
  })
);

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;

export const sessions = pgTable(
  "sessions",
  {
    sessionToken: text("session_token").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expires: timestamp("expires", { withTimezone: true, mode: "date" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("sessions_user_id_idx").on(table.userId),
  })
);

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { withTimezone: true, mode: "date" }).notNull(),
  },
  (table) => ({
    compoundKey: uniqueIndex("verification_tokens_identifier_token_uidx").on(
      table.identifier,
      table.token
    ),
  })
);

export type VerificationToken = typeof verificationTokens.$inferSelect;
export type NewVerificationToken = typeof verificationTokens.$inferInsert;

export const googleCalendarConnections = pgTable(
  "google_calendar_connections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    calendarId: text("calendar_id").notNull().default("primary"),
    calendarName: text("calendar_name"),
    accountEmail: text("account_email"),
    accountName: text("account_name"),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    tokenType: text("token_type").default("Bearer"),
    scope: text("scope"),
    syncEnabled: boolean("sync_enabled").notNull().default(true),
    syncShoots: boolean("sync_shoots").notNull().default(true),
    syncMeetings: boolean("sync_meetings").notNull().default(true),
    syncLocationScout: boolean("sync_location_scout").notNull().default(true),
    syncInternalEvents: boolean("sync_internal_events").notNull().default(true),
    syncFromGoogle: boolean("sync_from_google").notNull().default(true),
    syncToGoogle: boolean("sync_to_google").notNull().default(true),
    nextSyncToken: text("next_sync_token"),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    lastSyncStatus: text("last_sync_status").notNull().default("idle"),
    lastSyncMessage: text("last_sync_message"),
    lastErrorAt: timestamp("last_error_at", { withTimezone: true }),
    status: text("status")
      .$type<"connected" | "disconnected" | "revoked" | "error">()
      .notNull()
      .default("connected"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    organizationIdx: index("google_calendar_connections_org_idx").on(table.organizationId),
    orgCalendarUnique: uniqueIndex("google_calendar_connections_org_cal_uidx").on(
      table.organizationId,
      table.calendarId
    ),
  })
);

export type GoogleCalendarConnection = typeof googleCalendarConnections.$inferSelect;
export type NewGoogleCalendarConnection = typeof googleCalendarConnections.$inferInsert;

export const shootCalendarSync = pgTable(
  "shoot_calendar_sync",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    shootId: uuid("shoot_id")
      .notNull()
      .references(() => shoots.id, { onDelete: "cascade" }),
    provider: text("provider").notNull().default("google"),
    externalCalendarId: text("external_calendar_id").notNull().default("primary"),
    externalEventId: text("external_event_id").notNull(),
    externalEventEtag: text("external_event_etag"),
    externalICalUID: text("external_ical_uid"),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }).defaultNow().notNull(),
    lastSyncHash: text("last_sync_hash"),
    syncStatus: text("sync_status").notNull().default("synced"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    orgShootProviderUnique: uniqueIndex("shoot_calendar_sync_org_shoot_provider_uidx").on(
      table.organizationId,
      table.shootId,
      table.provider
    ),
    orgProviderEventUnique: uniqueIndex("shoot_calendar_sync_org_provider_event_uidx").on(
      table.organizationId,
      table.provider,
      table.externalEventId
    ),
    shootIdIdx: index("shoot_calendar_sync_shoot_idx").on(table.shootId),
  })
);

export type ShootCalendarSync = typeof shootCalendarSync.$inferSelect;
export type NewShootCalendarSync = typeof shootCalendarSync.$inferInsert;
