import { z } from "zod";
import type { Shoot } from "@/server/db/schema";
import type { CalendarFilters } from "@/server/db/calendar";

const filterIdSchema = z.string().uuid();

export const filtersSchema = z.object({
  projectId: filterIdSchema.optional(),
  crewMemberId: filterIdSchema.optional(),
  equipmentItemId: filterIdSchema.optional(),
});

export interface CalendarRepositoryPort {
  listRange(organizationId: string, start: Date, end: Date, filters?: CalendarFilters): Promise<Shoot[]>;
}

export function createCalendarService(repository: CalendarRepositoryPort) {
  return {
    async list(organizationId: string, start: Date, end: Date, filters: unknown = {}) {
      if (end <= start) throw new Error("Calendar range must end after it starts.");
      const sanitized: CalendarFilters = {};
      if (typeof filters === "object" && filters !== null) {
        const raw = filters as Record<string, unknown>;
        const p = filterIdSchema.safeParse(typeof raw.projectId === "string" ? raw.projectId.trim() : raw.projectId);
        if (p.success) sanitized.projectId = p.data;
        const c = filterIdSchema.safeParse(typeof raw.crewMemberId === "string" ? raw.crewMemberId.trim() : raw.crewMemberId);
        if (c.success) sanitized.crewMemberId = c.data;
        const e = filterIdSchema.safeParse(typeof raw.equipmentItemId === "string" ? raw.equipmentItemId.trim() : raw.equipmentItemId);
        if (e.success) sanitized.equipmentItemId = e.data;
      }
      return repository.listRange(organizationId, start, end, sanitized);
    },
  };
}
