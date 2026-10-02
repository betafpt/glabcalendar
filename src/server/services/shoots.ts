import { z } from "zod";
import type { Shoot } from "@/server/db/schema";

export const shootStatusSchema = z.enum([
  "planned",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
]);

const nullableTrimmed = z
  .string()
  .trim()
  .transform((value) => (value.length ? value : null))
  .nullable()
  .optional();

const nullableUuid = z
  .union([z.string().uuid(), z.literal(""), z.null()])
  .transform((value) => (value === "" ? null : value))
  .optional();

const nullableDateTime = z
  .union([z.coerce.date(), z.literal(""), z.null()])
  .transform((value) => (value === "" ? null : value))
  .optional();

export const shootInputSchema = z
  .object({
    projectId: nullableUuid,
    title: z.string().trim().min(1, "Shoot title is required."),
    status: shootStatusSchema.default("planned"),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    callTime: nullableDateTime,
    locationName: nullableTrimmed,
    locationAddress: nullableTrimmed,
    notes: nullableTrimmed,
  })
  .superRefine((value, ctx) => {
    if (value.endsAt <= value.startsAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endsAt"],
        message: "End time must be after start time.",
      });
    }
  });

export type ShootInput = z.infer<typeof shootInputSchema>;

export interface ShootRepositoryPort {
  list(organizationId: string): Promise<Shoot[]>;
  findById(organizationId: string, shootId: string): Promise<Shoot | null>;
  create(input: {
    organizationId: string;
    projectId?: string | null;
    title: string;
    status: string;
    startsAt: Date;
    endsAt: Date;
    callTime?: Date | null;
    locationName?: string | null;
    locationAddress?: string | null;
    notes?: string | null;
  }): Promise<Shoot>;
  update(
    organizationId: string,
    shootId: string,
    input: Partial<{
      projectId: string | null;
      title: string;
      status: string;
      startsAt: Date;
      endsAt: Date;
      callTime: Date | null;
      locationName: string | null;
      locationAddress: string | null;
      notes: string | null;
    }>
  ): Promise<Shoot | null>;
  remove(organizationId: string, shootId: string): Promise<boolean>;
}

export type ShootServiceResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: {
        code: "VALIDATION_ERROR" | "NOT_FOUND";
        message: string;
        fieldErrors?: Record<string, string[] | undefined>;
      };
    };

function validationFailure(error: z.ZodError): ShootServiceResult<never> {
  return {
    ok: false,
    error: {
      code: "VALIDATION_ERROR",
      message: "Shoot data is invalid.",
      fieldErrors: error.flatten().fieldErrors,
    },
  };
}

export function createShootService(repository: ShootRepositoryPort) {
  return {
    list(organizationId: string) {
      return repository.list(organizationId);
    },

    get(organizationId: string, shootId: string) {
      return repository.findById(organizationId, shootId);
    },

    async create(
      organizationId: string,
      input: unknown
    ): Promise<ShootServiceResult<Shoot>> {
      const parsed = shootInputSchema.safeParse(input);
      if (!parsed.success) return validationFailure(parsed.error);

      const shoot = await repository.create({
        organizationId,
        ...parsed.data,
      });
      return { ok: true, data: shoot };
    },

    async update(
      organizationId: string,
      shootId: string,
      input: unknown
    ): Promise<ShootServiceResult<Shoot>> {
      const parsed = shootInputSchema.safeParse(input);
      if (!parsed.success) return validationFailure(parsed.error);

      const shoot = await repository.update(
        organizationId,
        shootId,
        parsed.data
      );
      if (!shoot) {
        return {
          ok: false,
          error: { code: "NOT_FOUND", message: "Shoot not found." },
        };
      }

      return { ok: true, data: shoot };
    },

    async remove(organizationId: string, shootId: string): Promise<ShootServiceResult<null>> {
      const removed = await repository.remove(organizationId, shootId);
      return removed
        ? { ok: true, data: null }
        : { ok: false, error: { code: "NOT_FOUND", message: "Shoot not found." } };
    },
  };
}
