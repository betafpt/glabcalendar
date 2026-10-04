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

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { withTimezone: true, mode: "date" }),
  image: text("image"),
  role: text("role").$type<"super_admin" | "user">().default("user").notNull(),
  phoneNumber: text("phone_number"),
  phoneVerified: timestamp("phone_verified", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export const organizationMemberships = pgTable(
  "organization_memberships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role")
      .$type<"OWNER" | "ADMIN" | "PRODUCER" | "MEMBER" | "VIEWER">()
      .notNull()
      .default("MEMBER"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userOrgUnique: uniqueIndex("organization_memberships_user_org_uidx").on(
      table.userId,
      table.organizationId
    ),
    orgIdx: index("organization_memberships_org_idx").on(table.organizationId),
    userIdx: index("organization_memberships_user_idx").on(table.userId),
  })
);

export type OrganizationMembership = typeof organizationMemberships.$inferSelect;
export type NewOrganizationMembership = typeof organizationMemberships.$inferInsert;


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
    coverImageUrl: text("cover_image_url"),
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
    createdBy: uuid("created_by").references(() => users.id, {
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
    syncPolicy: text("sync_policy")
      .$type<"google" | "local_only" | "excluded">()
      .notNull()
      .default("google"),
    isTestData: boolean("is_test_data").notNull().default(false),
    sourceCalendarId: text("source_calendar_id"),
    externalEventId: text("external_event_id"),
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
    createdByIdx: index("shoots_created_by_idx").on(table.createdBy),
    isTestDataIdx: index("shoots_is_test_data_idx").on(
      table.organizationId,
      table.isTestData
    ),
    syncPolicyIdx: index("shoots_sync_policy_idx").on(
      table.organizationId,
      table.syncPolicy
    ),
    validInterval: check(
      "shoots_valid_interval",
      sql`${table.endsAt} > ${table.startsAt}`
    ),
  })
);

type ShootRow = typeof shoots.$inferSelect;
export type Shoot = Omit<ShootRow, "createdBy"> & { createdBy?: string | null };
export type NewShoot = typeof shoots.$inferInsert;

export const crewMembers = pgTable(
  "crew_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
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
    userIdx: index("crew_members_user_id_idx").on(table.userId),
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
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    calendarId: text("calendar_id").notNull().default("primary"),
    calendarName: text("calendar_name"),
    targetCalendarId: text("target_calendar_id"),
    sourceCalendarIds: text("source_calendar_ids"),
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
    userIdx: index("google_calendar_connections_user_id_idx").on(table.userId),
    orgUserCalendarUnique: uniqueIndex("google_calendar_connections_org_user_cal_uidx").on(
      table.organizationId,
      table.userId,
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
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    shootId: uuid("shoot_id")
      .notNull()
      .references(() => shoots.id, { onDelete: "cascade" }),
    provider: text("provider").notNull().default("google"),
    externalCalendarId: text("external_calendar_id").notNull().default("primary"),
    externalEventId: text("external_event_id").notNull(),
    externalEventEtag: text("external_event_etag"),
    externalEventUpdatedAt: timestamp("external_event_updated_at", { withTimezone: true }),
    externalICalUID: text("external_ical_uid"),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }).defaultNow().notNull(),
    lastSyncHash: text("last_sync_hash"),
    syncStatus: text("sync_status").notNull().default("synced"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    orgUserShootProviderUnique: uniqueIndex("shoot_calendar_sync_org_user_shoot_provider_uidx").on(
      table.organizationId,
      table.userId,
      table.shootId,
      table.provider
    ),
    orgUserProviderEventUnique: uniqueIndex("shoot_calendar_sync_org_user_provider_event_uidx").on(
      table.organizationId,
      table.userId,
      table.provider,
      table.externalEventId
    ),
    shootIdIdx: index("shoot_calendar_sync_shoot_idx").on(table.shootId),
    userIdIdx: index("shoot_calendar_sync_user_id_idx").on(table.userId),
  })
);

export type ShootCalendarSync = typeof shootCalendarSync.$inferSelect;
export type NewShootCalendarSync = typeof shootCalendarSync.$inferInsert;

export const excludedGoogleCalendarEvents = pgTable(
  "excluded_google_calendar_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    calendarId: text("calendar_id").notNull().default("primary"),
    externalEventId: text("external_event_id").notNull(),
    reason: text("reason").notNull().default("birthday"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    orgUserCalendarEventUnique: uniqueIndex("excluded_google_events_org_user_cal_event_uidx").on(
      table.organizationId,
      table.userId,
      table.calendarId,
      table.externalEventId
    ),
    userIdx: index("excluded_google_events_user_idx").on(table.userId),
  })
);

export type ExcludedGoogleCalendarEvent = typeof excludedGoogleCalendarEvents.$inferSelect;
export type NewExcludedGoogleCalendarEvent = typeof excludedGoogleCalendarEvents.$inferInsert;

export const aiAuditLogs = pgTable(
  "ai_audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    originalRequest: text("original_request").notNull(),
    actionType: text("action_type").notNull(),
    proposedAction: text("proposed_action").notNull(),
    validatedAction: text("validated_action").notNull(),
    affectedEntityIds: text("affected_entity_ids").notNull(),
    result: text("result").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    orgIdx: index("ai_audit_logs_org_idx").on(table.organizationId),
    createdAtIdx: index("ai_audit_logs_created_at_idx").on(table.createdAt),
  })
);

export type AiAuditLog = typeof aiAuditLogs.$inferSelect;
export type NewAiAuditLog = typeof aiAuditLogs.$inferInsert;

export const aiProviderCredentials = pgTable(
  "ai_provider_credentials",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerType: text("owner_type").$type<"user" | "workspace">().notNull(),
    ownerId: text("owner_id").notNull(),
    provider: text("provider").notNull().default("302ai"),
    encryptedSecret: text("encrypted_secret").notNull(),
    secretLast4: text("secret_last4").notNull(),
    status: text("status").$type<"active" | "revoked">().notNull().default("active"),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    ownerIdx: index("ai_provider_credentials_owner_idx").on(table.ownerType, table.ownerId),
    ownerProviderStatusIdx: index("ai_provider_credentials_owner_provider_status_idx").on(
      table.ownerType,
      table.ownerId,
      table.provider,
      table.status
    ),
  })
);

export type AiProviderCredential = typeof aiProviderCredentials.$inferSelect;
export type NewAiProviderCredential = typeof aiProviderCredentials.$inferInsert;

export const aiEntitlements = pgTable(
  "ai_entitlements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerType: text("owner_type").$type<"user" | "workspace">().notNull(),
    ownerId: text("owner_id").notNull(),
    plan: text("plan").$type<"free" | "pro" | "studio">().notNull().default("free"),
    status: text("status").$type<"active" | "suspended" | "canceled">().notNull().default("active"),
    monthlyCredits: integer("monthly_credits").notNull().default(100),
    usedCredits: integer("used_credits").notNull().default(0),
    resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
    allowBYOK: boolean("allow_byok").notNull().default(true),
    allowManagedAI: boolean("allow_managed_ai").notNull().default(false),
    allowedModels: text("allowed_models").notNull().default("gpt-4o"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    ownerUnique: uniqueIndex("ai_entitlements_owner_uidx").on(table.ownerType, table.ownerId),
  })
);

export type AiEntitlement = typeof aiEntitlements.$inferSelect;
export type NewAiEntitlement = typeof aiEntitlements.$inferInsert;

export const aiUsages = pgTable(
  "ai_usages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id"),
    workspaceId: text("workspace_id"),
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    capability: text("capability").notNull(),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    totalTokens: integer("total_tokens").notNull().default(0),
    estimatedCost: text("estimated_cost"),
    creditsUsed: integer("credits_used").notNull().default(1),
    credentialSource: text("credential_source")
      .$type<"user" | "workspace" | "platform" | "dev_fallback">()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userTimeIdx: index("ai_usages_user_time_idx").on(table.userId, table.createdAt),
    workspaceTimeIdx: index("ai_usages_workspace_time_idx").on(table.workspaceId, table.createdAt),
  })
);

export type AiUsage = typeof aiUsages.$inferSelect;
export type NewAiUsage = typeof aiUsages.$inferInsert;

export const clients = pgTable(
  "clients",
  {
    id: text("id").primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    projects: integer("projects").notNull().default(0),
    email: text("email"),
    phone: text("phone"),
    website: text("website"),
    address: text("address"),
    description: text("description"),
    notes: text("notes"),
    contacts: text("contacts"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    orgIdx: index("clients_organization_id_idx").on(table.organizationId),
  })
);

export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;

export const shootAssignees = pgTable(
  "shoot_assignees",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    shootId: uuid("shoot_id")
      .notNull()
      .references(() => shoots.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role"),
    status: text("status")
      .$type<"pending" | "accepted" | "declined">()
      .notNull()
      .default("pending"),
    assignedBy: uuid("assigned_by").references(() => users.id, {
      onDelete: "set null",
    }),
    assignedAt: timestamp("assigned_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    shootUserUnique: uniqueIndex("shoot_assignees_shoot_user_uidx").on(
      table.shootId,
      table.userId
    ),
    shootIdx: index("shoot_assignees_shoot_idx").on(table.shootId),
    userIdx: index("shoot_assignees_user_idx").on(table.userId),
  })
);

export type ShootAssignee = typeof shootAssignees.$inferSelect;
export type NewShootAssignee = typeof shootAssignees.$inferInsert;

export const pendingShootAssignments = pgTable(
  "pending_shoot_assignments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    shootId: uuid("shoot_id")
      .notNull()
      .references(() => shoots.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role").notNull().default("MEMBER"),
    assignedBy: uuid("assigned_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    shootEmailUnique: uniqueIndex("pending_shoot_assignments_shoot_email_uidx").on(
      table.shootId,
      table.email
    ),
    orgEmailIdx: index("pending_shoot_assignments_org_email_idx").on(
      table.organizationId,
      table.email
    ),
    shootIdx: index("pending_shoot_assignments_shoot_idx").on(table.shootId),
  })
);

export type PendingShootAssignment = typeof pendingShootAssignments.$inferSelect;
export type NewPendingShootAssignment = typeof pendingShootAssignments.$inferInsert;

export const pendingInvitations = pgTable(
  "pending_invitations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role")
      .$type<"OWNER" | "ADMIN" | "PRODUCER" | "MEMBER" | "VIEWER">()
      .notNull()
      .default("MEMBER"),
    invitedBy: uuid("invited_by").references(() => users.id, {
      onDelete: "set null",
    }),
    status: text("status")
      .$type<"pending" | "accepted" | "revoked" | "expired">()
      .notNull()
      .default("pending"),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    emailStatusIdx: index("pending_invitations_email_status_idx").on(
      table.email,
      table.status
    ),
    orgIdx: index("pending_invitations_org_idx").on(table.organizationId),
  })
);

export type PendingInvitation = typeof pendingInvitations.$inferSelect;
export type NewPendingInvitation = typeof pendingInvitations.$inferInsert;

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    type: text("type")
      .$type<
        | "EVENT_ASSIGNED"
        | "EVENT_ASSIGNMENT_ACCEPTED"
        | "EVENT_ASSIGNMENT_DECLINED"
        | "EVENT_UPDATED"
        | "EVENT_CANCELLED"
        | "INVITATION_RECEIVED"
      >()
      .notNull(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    entityType: text("entity_type"),
    entityId: text("entity_id"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userReadIdx: index("notifications_user_read_idx").on(
      table.userId,
      table.readAt
    ),
    userCreatedIdx: index("notifications_user_created_idx").on(
      table.userId,
      table.createdAt
    ),
  })
);

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
