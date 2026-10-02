import { unstable_cache } from "next/cache";
import { asc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { crewMembers, equipmentItems, projects } from "@/server/db/schema";

export type ShootProjectOption = {
  id: string;
  name: string;
};

export type ShootCrewOption = {
  id: string;
  name: string;
  defaultRole: string | null;
  status: string;
};

export type ShootEquipmentOption = {
  id: string;
  name: string;
  assetCode: string | null;
  status: string;
};

export const SHOOT_DETAIL_PROJECT_OPTIONS_TAG = "shoot-detail-project-options";
export const SHOOT_DETAIL_CREW_OPTIONS_TAG = "shoot-detail-crew-options";
export const SHOOT_DETAIL_EQUIPMENT_OPTIONS_TAG = "shoot-detail-equipment-options";

export const getShootDetailOptions = unstable_cache(
  async (organizationId: string) => {
    const [projectOptions, crewOptions, equipmentOptions] = await Promise.all([
      db
        .select({ id: projects.id, name: projects.name })
        .from(projects)
        .where(eq(projects.organizationId, organizationId))
        .orderBy(asc(projects.name)),
      db
        .select({
          id: crewMembers.id,
          name: crewMembers.name,
          defaultRole: crewMembers.defaultRole,
          status: crewMembers.status,
        })
        .from(crewMembers)
        .where(eq(crewMembers.organizationId, organizationId))
        .orderBy(asc(crewMembers.name)),
      db
        .select({
          id: equipmentItems.id,
          name: equipmentItems.name,
          assetCode: equipmentItems.assetCode,
          status: equipmentItems.status,
        })
        .from(equipmentItems)
        .where(eq(equipmentItems.organizationId, organizationId))
        .orderBy(asc(equipmentItems.name)),
    ]);

    return { projectOptions, crewOptions, equipmentOptions };
  },
  ["glab-shoot-detail-options"],
  {
    revalidate: 300,
    tags: [
      SHOOT_DETAIL_PROJECT_OPTIONS_TAG,
      SHOOT_DETAIL_CREW_OPTIONS_TAG,
      SHOOT_DETAIL_EQUIPMENT_OPTIONS_TAG,
    ],
  }
);
