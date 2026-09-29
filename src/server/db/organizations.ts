import { asc, eq } from "drizzle-orm";
import type { Database } from "./index";
import {
  organizations,
  type NewOrganization,
  type Organization,
} from "./schema";

export type CreateOrganizationInput = Pick<
  NewOrganization,
  "name" | "timezone"
>;

export function createOrganizationRepository(database: Database) {
  return {
    async findById(id: string): Promise<Organization | null> {
      const [organization] = await database
        .select()
        .from(organizations)
        .where(eq(organizations.id, id))
        .limit(1);

      return organization ?? null;
    },

    async findInitial(): Promise<Organization | null> {
      const [organization] = await database
        .select()
        .from(organizations)
        .orderBy(asc(organizations.createdAt))
        .limit(1);

      return organization ?? null;
    },

    async create(input: CreateOrganizationInput): Promise<Organization> {
      const [organization] = await database
        .insert(organizations)
        .values(input)
        .returning();

      if (!organization) {
        throw new Error("Failed to create organization.");
      }

      return organization;
    },

    async getOrCreateInitial(
      input: CreateOrganizationInput
    ): Promise<Organization> {
      const existing = await this.findInitial();
      return existing ?? this.create(input);
    },
  };
}

