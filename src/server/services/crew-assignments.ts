import { z } from "zod";
import type { CrewConflict } from "@/server/db/crew-assignments";
import type { Shoot, ShootCrewAssignment } from "@/server/db/schema";

const assignmentInputSchema = z.object({
  shootId: z.string().uuid(),
  crewMemberId: z.string().uuid(),
  role: z.string().trim().transform((value) => value || null).nullable().optional(),
  notes: z.string().trim().transform((value) => value || null).nullable().optional(),
});

export interface CrewAssignmentRepositoryPort {
  findConflicts(
    organizationId: string,
    crewMemberId: string,
    targetShootId: string,
    startsAt: Date,
    endsAt: Date
  ): Promise<CrewConflict[]>;
  create(input: {
    organizationId: string;
    shootId: string;
    crewMemberId: string;
    role?: string | null;
    notes?: string | null;
  }): Promise<ShootCrewAssignment>;
  remove(organizationId: string, assignmentId: string): Promise<boolean>;
}

export interface ShootLookupPort {
  findById(organizationId: string, shootId: string): Promise<Shoot | null>;
}

export type CrewAssignmentResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: {
        code: "VALIDATION_ERROR" | "NOT_FOUND" | "CONFLICT";
        message: string;
        conflicts?: CrewConflict[];
      };
    };

export function createCrewAssignmentService(
  assignments: CrewAssignmentRepositoryPort,
  shoots: ShootLookupPort
) {
  return {
    async assign(organizationId: string, input: unknown): Promise<CrewAssignmentResult<ShootCrewAssignment>> {
      const parsed = assignmentInputSchema.safeParse(input);
      if (!parsed.success) {
        return { ok: false, error: { code: "VALIDATION_ERROR", message: "Crew assignment data is invalid." } };
      }

      const shoot = await shoots.findById(organizationId, parsed.data.shootId);
      if (!shoot) {
        return { ok: false, error: { code: "NOT_FOUND", message: "Shoot not found." } };
      }

      const conflicts = await assignments.findConflicts(
        organizationId,
        parsed.data.crewMemberId,
        shoot.id,
        shoot.startsAt,
        shoot.endsAt
      );

      if (conflicts.length) {
        return {
          ok: false,
          error: {
            code: "CONFLICT",
            message: "Crew member is already scheduled for an overlapping shoot.",
            conflicts,
          },
        };
      }

      return {
        ok: true,
        data: await assignments.create({ organizationId, ...parsed.data }),
      };
    },

    async remove(organizationId: string, assignmentId: string): Promise<CrewAssignmentResult<null>> {
      const validId = z.string().uuid().safeParse(assignmentId);
      if (!validId.success) {
        return { ok: false, error: { code: "VALIDATION_ERROR", message: "Assignment id is invalid." } };
      }
      const removed = await assignments.remove(organizationId, assignmentId);
      return removed
        ? { ok: true, data: null }
        : { ok: false, error: { code: "NOT_FOUND", message: "Crew assignment not found." } };
    },
  };
}
