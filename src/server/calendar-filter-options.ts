import { unstable_cache } from "next/cache";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { crewMembers, equipmentItems, projects } from "@/server/db/schema";

export const CALENDAR_PROJECT_OPTIONS_TAG = "calendar-project-options";
export const CALENDAR_CREW_OPTIONS_TAG = "calendar-crew-options";
export const CALENDAR_EQUIPMENT_OPTIONS_TAG = "calendar-equipment-options";

const getProjectOptions = unstable_cache(
  async (organizationId: string) =>
    db
      .select({ id: projects.id, name: projects.name })
      .from(projects)
      .where(eq(projects.organizationId, organizationId))
      .orderBy(desc(projects.createdAt)),
  ["calendar-project-options"],
  { revalidate: 300, tags: [CALENDAR_PROJECT_OPTIONS_TAG] },
);

const getCrewOptions = unstable_cache(
  async (organizationId: string) =>
    db
      .select({ id: crewMembers.id, name: crewMembers.name })
      .from(crewMembers)
      .where(eq(crewMembers.organizationId, organizationId))
      .orderBy(asc(crewMembers.name)),
  ["calendar-crew-options"],
  { revalidate: 300, tags: [CALENDAR_CREW_OPTIONS_TAG] },
);

const getEquipmentOptions = unstable_cache(
  async (organizationId: string) =>
    db
      .select({ id: equipmentItems.id, name: equipmentItems.name })
      .from(equipmentItems)
      .where(eq(equipmentItems.organizationId, organizationId))
      .orderBy(asc(equipmentItems.name)),
  ["calendar-equipment-options"],
  { revalidate: 300, tags: [CALENDAR_EQUIPMENT_OPTIONS_TAG] },
);

export async function getCalendarFilterOptions(organizationId: string) {
  const [projectOptions, crewOptions, equipmentOptions] = await Promise.all([
    getProjectOptions(organizationId),
    getCrewOptions(organizationId),
    getEquipmentOptions(organizationId),
  ]);

  return {
    projects: projectOptions,
    crew: crewOptions,
    equipment: equipmentOptions,
  };
}
