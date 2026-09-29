import { z } from "zod";
import type { CrewMember } from "@/server/db/schema";

export const crewStatusSchema = z.enum(["active", "inactive"]);

const nullableTrimmed = z
  .string()
  .trim()
  .transform((value) => (value.length ? value : null))
  .nullable()
  .optional();

export const crewMemberInputSchema = z.object({
  name: z.string().trim().min(1, "Crew member name is required."),
  defaultRole: nullableTrimmed,
  phone: nullableTrimmed,
  email: z
    .union([z.string().trim().email("Enter a valid email address."), z.literal(""), z.null()])
    .transform((value) => (value === "" ? null : value))
    .optional(),
  status: crewStatusSchema.default("active"),
  notes: nullableTrimmed,
});

export interface CrewRepositoryPort {
  list(organizationId: string): Promise<CrewMember[]>;
  findById(organizationId: string, crewMemberId: string): Promise<CrewMember | null>;
  create(input: {
    organizationId: string;
    name: string;
    defaultRole?: string | null;
    phone?: string | null;
    email?: string | null;
    status: string;
    notes?: string | null;
  }): Promise<CrewMember>;
  update(
    organizationId: string,
    crewMemberId: string,
    input: Partial<{
      name: string;
      defaultRole: string | null;
      phone: string | null;
      email: string | null;
      status: string;
      notes: string | null;
    }>
  ): Promise<CrewMember | null>;
}

export type CrewServiceResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: {
        code: "VALIDATION_ERROR" | "NOT_FOUND";
        message: string;
        fieldErrors?: Record<string, string[] | undefined>;
      };
    };

function validationFailure(error: z.ZodError): CrewServiceResult<never> {
  return {
    ok: false,
    error: {
      code: "VALIDATION_ERROR",
      message: "Crew member data is invalid.",
      fieldErrors: error.flatten().fieldErrors,
    },
  };
}

export function createCrewService(repository: CrewRepositoryPort) {
  return {
    list: (organizationId: string) => repository.list(organizationId),
    get: (organizationId: string, crewMemberId: string) => repository.findById(organizationId, crewMemberId),
    async create(organizationId: string, input: unknown): Promise<CrewServiceResult<CrewMember>> {
      const parsed = crewMemberInputSchema.safeParse(input);
      if (!parsed.success) return validationFailure(parsed.error);
      return { ok: true, data: await repository.create({ organizationId, ...parsed.data }) };
    },
    async update(organizationId: string, crewMemberId: string, input: unknown): Promise<CrewServiceResult<CrewMember>> {
      const parsed = crewMemberInputSchema.safeParse(input);
      if (!parsed.success) return validationFailure(parsed.error);
      const crewMember = await repository.update(organizationId, crewMemberId, parsed.data);
      return crewMember
        ? { ok: true, data: crewMember }
        : { ok: false, error: { code: "NOT_FOUND", message: "Crew member not found." } };
    },
  };
}
