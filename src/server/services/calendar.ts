import { z } from "zod";
import type { Shoot } from "@/server/db/schema";
import type { CalendarFilters } from "@/server/db/calendar";

const filtersSchema = z.object({
  projectId: z.string().uuid().optional(),
  crewMemberId: z.string().uuid().optional(),
  equipmentItemId: z.string().uuid().optional(),
});

export interface CalendarRepositoryPort {
  listRange(organizationId: string, start: Date, end: Date, filters?: CalendarFilters): Promise<Shoot[]>;
}

export function createCalendarService(repository: CalendarRepositoryPort) {
  return {
    async list(organizationId: string, start: Date, end: Date, filters: unknown = {}) {
      if (end <= start) throw new Error("Calendar range must end after it starts.");
      const parsed = filtersSchema.safeParse(filters);
      return repository.listRange(organizationId, start, end, parsed.success ? parsed.data : {});
    },
  };
}
