import type { Shoot } from "@/server/db/schema";

export function canManageShoot(
  shoot: Pick<Shoot, "createdBy">,
  userId: string,
  membershipRole: string,
  userRole?: string | null
) {
  if (userRole === "super_admin") return true;
  if (shoot.createdBy) return shoot.createdBy === userId;
  return ["OWNER", "ADMIN", "PRODUCER"].includes(membershipRole);
}
