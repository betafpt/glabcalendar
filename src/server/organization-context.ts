import { unstable_cache } from "next/cache";
import { getServerConfig } from "@/lib/config";
import { db } from "@/server/db";
import { createOrganizationRepository } from "@/server/db/organizations";

/**
 * The app currently operates on one workspace. Cache that workspace record so
 * normal page-to-page navigation does not pay an extra database round trip on
 * every request.
 */
export const getInitialOrganization = unstable_cache(
  async () => {
    const config = getServerConfig();
    return createOrganizationRepository(db).getOrCreateInitial({
      name: "G.Lab Studio",
      timezone: config.appTimezone,
    });
  },
  ["glab-initial-organization"],
  { revalidate: 3600 }
);
