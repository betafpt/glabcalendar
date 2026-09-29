import { z } from "zod";
import type { ShootChecklistItem } from "@/server/db/schema";

const createSchema = z.object({
  shootId: z.string().uuid(),
  title: z.string().trim().min(1, "Checklist item title is required."),
  sortOrder: z.coerce.number().int().min(0).default(0),
  assignedCrewMemberId: z.union([z.string().uuid(), z.literal(""), z.null()]).transform((value) => value || null).optional(),
});

export interface ChecklistRepositoryPort {
  create(input: { organizationId: string; shootId: string; title: string; sortOrder: number; assignedCrewMemberId?: string | null }): Promise<ShootChecklistItem>;
  update(organizationId: string, itemId: string, input: Partial<{ title: string; sortOrder: number; assignedCrewMemberId: string | null; isCompleted: boolean; completedAt: Date | null }>): Promise<ShootChecklistItem | null>;
  remove(organizationId: string, itemId: string): Promise<boolean>;
}

export type ChecklistResult<T> = { ok: true; data: T } | { ok: false; error: { code: "VALIDATION_ERROR" | "NOT_FOUND"; message: string } };

export function createChecklistService(repository: ChecklistRepositoryPort) {
  return {
    async create(organizationId: string, input: unknown): Promise<ChecklistResult<ShootChecklistItem>> {
      const parsed = createSchema.safeParse(input);
      if (!parsed.success) return { ok: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Checklist data is invalid." } };
      return { ok: true, data: await repository.create({ organizationId, ...parsed.data }) };
    },
    async setCompleted(organizationId: string, itemId: string, completed: boolean): Promise<ChecklistResult<ShootChecklistItem>> {
      if (!z.string().uuid().safeParse(itemId).success) return { ok: false, error: { code: "VALIDATION_ERROR", message: "Checklist item id is invalid." } };
      const item = await repository.update(organizationId, itemId, { isCompleted: completed, completedAt: completed ? new Date() : null });
      return item ? { ok: true, data: item } : { ok: false, error: { code: "NOT_FOUND", message: "Checklist item not found." } };
    },
    async remove(organizationId: string, itemId: string): Promise<ChecklistResult<null>> {
      const removed = await repository.remove(organizationId, itemId);
      return removed ? { ok: true, data: null } : { ok: false, error: { code: "NOT_FOUND", message: "Checklist item not found." } };
    },
  };
}
